# Compress the baked Cabin into the files the site serves. Run in headless Blender:
#   blender -b --factory-startup --python compress.py [-- <webp quality, default 90>]
# Reads cabin.glb, light_day_dn.hdr and light_night_dn.hdr from $CABIN_OUT (or out/ beside this file) and writes
# into public/cabin/:
#   cabin.<hash>.glb          the same scene with Draco mesh compression
#   light-<tag>.<hash>.webp   the lightmap as 8-bit sRGB-encoded (light / scale)
#   manifest.json             the current file names and each lightmap's scale
# <hash> is the first 8 hex digits of the file's SHA-256. Files of an earlier version are removed.
import bpy, sys, os, json, hashlib, glob
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get('CABIN_OUT') or os.path.join(HERE, 'out')
DST = os.path.join(HERE, '..', '..', 'public', 'cabin')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
QUALITY = int(args[0]) if args else 90
os.makedirs(DST, exist_ok=True)

def publish(tmp, stem, ext):
    """move tmp to <stem>.<hash>.<ext> in DST, dropping that asset's earlier versions; returns the file name"""
    digest = hashlib.sha256(open(tmp, 'rb').read()).hexdigest()[:8]
    for old in glob.glob(os.path.join(DST, f'{stem}.*.{ext}')): os.remove(old)
    name = f'{stem}.{digest}.{ext}'; os.replace(tmp, os.path.join(DST, name))
    print(f'WROTE {name} {os.path.getsize(os.path.join(DST, name))} bytes')
    return name

def srgb(x): return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-9), 1 / 2.4) - 0.055)

def lightmap(tag):
    src = bpy.data.images.load(os.path.join(SRC, f'light_{tag}_dn.hdr')); w, h = src.size
    px = np.empty(w * h * 4, dtype=np.float32); src.pixels.foreach_get(px); rgb = px.reshape(h, w, 4)[:, :, :3]
    scale = float(np.ceil(rgb.max() * 4) / 4)   # the brightest texel maps to at most 1
    out = bpy.data.images.new(f'light-{tag}', w, h, alpha=False); out.colorspace_settings.name = 'Non-Color'
    buf = np.ones((h, w, 4), dtype=np.float32); buf[:, :, :3] = np.clip(srgb(rgb / scale), 0, 1)
    out.pixels.foreach_set(buf.ravel())
    tmp = os.path.join(DST, f'.light-{tag}.webp'); out.filepath_raw = tmp; out.file_format = 'WEBP'; out.save(quality=QUALITY)
    return {'file': publish(tmp, f'light-{tag}', 'webp'), 'scale': scale}

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
manifest = {'lightmaps': {tag: lightmap(tag) for tag in ('day', 'night')}}
manifest = {'geometry': geometry(), **manifest}
with open(os.path.join(DST, 'manifest.json'), 'w') as f: json.dump(manifest, f, indent=2); f.write('\n')
print('DONE', json.dumps(manifest))
