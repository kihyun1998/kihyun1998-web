#!/usr/bin/env python3
"""Check the committed Cabin assets in public/cabin/ against their manifest. Needs only Python 3.

    python3 tools/cabin/verify.py [directory, default public/cabin]

Exits non-zero and lists every failure when the assets are not what the page expects.
"""
import hashlib, json, os, re, struct, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'public', 'cabin')
MAX_LIGHTMAP_BYTES = 1_000_000
MAX_GEOMETRY_BYTES = 1_000_000
MAX_TEXTURE_BYTES = 200_000
failures = []

def check(ok, message):
    if not ok: failures.append(message)
    return ok

def read(name):
    with open(os.path.join(DIR, name), 'rb') as f: return f.read()

def versioned(name, stem, ext):
    """the name is <stem>.<first 8 hex of the content's SHA-256>.<ext>, and the file exists"""
    if not check(os.path.isfile(os.path.join(DIR, name)), f'{name}: listed in the manifest but missing'): return None
    data = read(name); digest = hashlib.sha256(data).hexdigest()[:8]
    check(name == f'{stem}.{digest}.{ext}', f'{name}: name does not carry its content hash (expected {stem}.{digest}.{ext})')
    return data

def avif_size(data, name):
    """(width, height) of an AVIF image, read from its first image spatial extents (ispe) box"""
    if not check(data[4:8] == b'ftyp' and data[8:12] == b'avif', f'{name}: not an AVIF file'): return None
    at = data.find(b'ispe')
    if not check(at > 0 and len(data) >= at + 16, f'{name}: no image size (ispe) box'): return None
    return struct.unpack('>II', data[at + 8:at + 16])

def glb_json(data, name):
    if not check(data[:4] == b'glTF', f'{name}: not a GLB file'): return None
    length, kind = struct.unpack('<I4s', data[12:20])
    if not check(kind == b'JSON', f'{name}: first chunk is not JSON'): return None
    return json.loads(data[20:20 + length])

manifest = json.loads(read('manifest.json'))
listed = {'manifest.json'}

geo_name = manifest['geometry']; listed.add(geo_name)
geo = versioned(geo_name, 'cabin', 'glb')
if geo is not None:
    check(len(geo) <= MAX_GEOMETRY_BYTES, f'{geo_name}: {len(geo)} bytes, over {MAX_GEOMETRY_BYTES}')
    gltf = glb_json(geo, geo_name)
    if gltf is not None:
        check('KHR_draco_mesh_compression' in gltf.get('extensionsRequired', []), f'{geo_name}: not Draco-compressed')
        nodes = {n.get('name'): n for n in gltf['nodes']}
        prims = lambda node: gltf['meshes'][node['mesh']]['primitives']
        if check('Cabin' in nodes and 'mesh' in nodes.get('Cabin', {}), f'{geo_name}: no mesh node named Cabin'):
            check(all('TEXCOORD_1' in p['attributes'] for p in prims(nodes['Cabin'])),
                  f'{geo_name}: a Cabin primitive has no lightmap UV set (TEXCOORD_1)')
        for name in ('SeatBackLeft', 'SeatBackRight'):
            if check(name in nodes and 'mesh' in nodes.get(name, {}), f'{geo_name}: no mesh node named {name}'):
                check(all('TEXCOORD_1' in p['attributes'] for p in prims(nodes[name])),
                      f'{geo_name}: a {name} primitive has no lightmap UV set (TEXCOORD_1)')
        if check('Screen' in nodes and 'mesh' in nodes.get('Screen', {}), f'{geo_name}: no mesh node named Screen'):
            check(nodes['Screen']['mesh'] != nodes.get('Cabin', {}).get('mesh'), f'{geo_name}: Screen shares the Cabin mesh')
            check(all('TEXCOORD_0' in p['attributes'] and 'TEXCOORD_1' not in p['attributes'] for p in prims(nodes['Screen'])),
                  f'{geo_name}: Screen must carry its own UVs and no lightmap UVs')

materials = {m.get('name') for m in gltf.get('materials', [])} if geo is not None and gltf is not None else None
textures = manifest.get('textures', {}); surfaces = manifest.get('surfaces', {})
check(bool(textures) and bool(surfaces), 'manifest: no surface textures or no surfaces')
for kind, entry in textures.items():
    name = entry.get('file', ''); listed.add(name)
    data = versioned(name, f'tex-{kind}', 'avif')
    check(isinstance(entry.get('tile'), (int, float)) and entry['tile'] > 0, f'manifest: texture {kind} has no positive tile')
    check(isinstance(entry.get('mean'), (int, float)) and 0 < entry['mean'] <= 1, f'manifest: texture {kind} has no mean in (0, 1]')
    check(kind in surfaces.values(), f'manifest: texture {kind} is used by no surface')
    if data is None: continue
    check(len(data) <= MAX_TEXTURE_BYTES, f'{name}: {len(data)} bytes, over {MAX_TEXTURE_BYTES}')
    avif_size(data, name)
for material, kind in surfaces.items():
    check(kind in textures, f'manifest: surface {material} names the texture {kind}, which the manifest does not list')
    if materials is not None: check(material in materials, f'manifest: surface {material} is no material of {geo_name}')

sizes = {}
check(set(manifest['lightmaps']) in ({'day', 'night'}, {'day', 'night', 'ambient'}),
      f'manifest: lightmaps are {sorted(manifest["lightmaps"])}, expected day and night, and ambient where the bake has the layer')
for tag, entry in manifest['lightmaps'].items():
    name = entry['file']; listed.add(name)
    data = versioned(name, f'light-{tag}', 'avif')
    check(isinstance(entry.get('scale'), (int, float)) and entry['scale'] > 0, f'manifest: lightmap {tag} has no positive scale')
    check(entry.get('encoding') == 'srgb-thrice', f'manifest: lightmap {tag} has encoding {entry.get("encoding")!r}, expected srgb-thrice')
    if data is None: continue
    check(len(data) <= MAX_LIGHTMAP_BYTES, f'{name}: {len(data)} bytes, over {MAX_LIGHTMAP_BYTES}')
    sizes[tag] = avif_size(data, name)
if len(sizes) > 1 and all(sizes.values()):
    check(len(set(sizes.values())) == 1, 'lightmaps differ in size: ' + ', '.join(f'{tag} {size}' for tag, size in sizes.items()))

for name in sorted(n for n in os.listdir(DIR) if not n.startswith('.')):
    check(name in listed, f'{name}: in the directory but not in the manifest (a stale version?)')

for name in sorted(listed):
    if os.path.isfile(os.path.join(DIR, name)): print(f'{os.path.getsize(os.path.join(DIR, name)):>9} bytes  {name}')
if failures:
    print('\n'.join(f'FAIL {m}' for m in failures)); sys.exit(1)
print('OK')
