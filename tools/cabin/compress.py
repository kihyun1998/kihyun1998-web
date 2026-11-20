import bpy, sys, os, json, hashlib, glob
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get('CABIN_OUT') or os.path.join(HERE, 'out')
DST = os.path.join(HERE, '..', '..', 'public', 'cabin')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
QUALITY = int(args[0]) if args else 90
TEXTURE_QUALITY = int(args[1]) if len(args) > 1 else 80
os.makedirs(DST, exist_ok=True)

def publish(tmp, stem, ext):
    digest = hashlib.sha256(open(tmp, 'rb').read()).hexdigest()[:8]
    for old in glob.glob(os.path.join(DST, f'{stem}.*')): os.remove(old)
    name = f'{stem}.{digest}.{ext}'; os.replace(tmp, os.path.join(DST, name))
    print(f'WROTE {name} {os.path.getsize(os.path.join(DST, name))} bytes')
    return name

def srgb(x): return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-9), 1 / 2.4) - 0.055)

def lightmap(tag):
    src = bpy.data.images.load(os.path.join(SRC, f'light_{tag}_dn.hdr')); w, h = src.size
    px = np.empty(w * h * 4, dtype=np.float32); src.pixels.foreach_get(px); rgb = px.reshape(h, w, 4)[:, :, :3]
    scale = float(np.ceil(rgb.max() * 4) / 4)
    out = bpy.data.images.new(f'light-{tag}', w, h, alpha=False); out.colorspace_settings.name = 'Non-Color'
    buf = np.ones((h, w, 4), dtype=np.float32); buf[:, :, :3] = np.clip(srgb(srgb(srgb(rgb / scale))), 0, 1)
    out.pixels.foreach_set(buf.ravel())
    tmp = os.path.join(DST, f'.light-{tag}.avif'); out.filepath_raw = tmp; out.file_format = 'AVIF'; out.save(quality=QUALITY)
    return {'file': publish(tmp, f'light-{tag}', 'avif'), 'scale': scale, 'encoding': 'srgb-thrice'}

def linear(x): return np.where(x <= 0.04045, x / 12.92, np.power((x + 0.055) / 1.055, 2.4))

def texture(kind, tile):
    src = bpy.data.images.load(os.path.join(SRC, f'tex_{kind}.png')); src.colorspace_settings.name = 'Non-Color'
    src.pixels.foreach_get(np.empty(len(src.pixels), dtype=np.float32))     # reads the file in
    tmp = os.path.join(DST, f'.tex-{kind}.avif'); src.filepath_raw = tmp; src.file_format = 'AVIF'; src.save(quality=TEXTURE_QUALITY)
    name = publish(tmp, f'tex-{kind}', 'avif')
    stored = bpy.data.images.load(os.path.join(DST, name)); stored.colorspace_settings.name = 'Non-Color'
    px = np.empty(len(stored.pixels), dtype=np.float32); stored.pixels.foreach_get(px)
    return {'file': name, 'tile': tile, 'mean': round(float(linear(px.reshape(-1, 4)[:, :3]).mean()), 4)}

def geometry():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, 'cabin.glb'))
    tmp = os.path.join(DST, '.cabin.glb')
    bpy.ops.export_scene.gltf(filepath=tmp, export_format='GLB', export_yup=True, export_apply=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                              export_draco_position_quantization=14, export_draco_normal_quantization=10,
                              export_draco_texcoord_quantization=14)
    return publish(tmp, 'cabin', 'glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
manifest = {'lightmaps': {tag: lightmap(tag) for tag in ('day', 'night', 'ambient')}}
with open(os.path.join(SRC, 'textures.json')) as f: textures = json.load(f)
manifest['textures'] = {kind: texture(kind, tile) for kind, tile in textures['kinds'].items()}
manifest['surfaces'] = textures['materials']
manifest = {'geometry': geometry(), **manifest}
with open(os.path.join(DST, 'manifest.json'), 'w') as f: json.dump(manifest, f, indent=2); f.write('\n')
print('DONE', json.dumps(manifest))
