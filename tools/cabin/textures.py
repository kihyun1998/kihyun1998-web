# The Cabin's surface textures, generated from seeded noise: no image from elsewhere goes into them. Run in headless
# Blender (for its numpy and image writer):
#   blender -b --factory-startup --python textures.py
# Writes into $CABIN_OUT (or out/ beside this file):
#   tex_<kind>.png    for each kind of surface in KINDS, a seamless grey tile, sRGB, linear mean near MEAN, that the base
#                     colour of the materials using it is multiplied by
#   textures.json     each kind's tile size in metres, and which kind each Cabin material uses
# compress.py encodes them for the page, which projects each tile along the three world axes (no texture UVs).
import bpy, os, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('CABIN_OUT') or os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
MEAN = 0.8      # the tile's linear mean

def band(rng, n, longest, shortest, stretch=1.0):
    """seamless noise of unit spread, its features between `longest` and `shortest` pixels across; `stretch` > 1
    draws them that many times longer across the image than down it"""
    fy, fx = np.meshgrid(np.fft.fftfreq(n), np.fft.fftfreq(n), indexing='ij')
    r = np.hypot(fx * stretch, fy)
    lo, hi = 1 / longest, 1 / shortest
    gain = np.exp(-0.5 * (np.log(np.maximum(r, 1e-9) / np.sqrt(lo * hi)) / (0.5 * np.log(hi / lo))) ** 2)
    gain[0, 0] = 0
    out = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((n, n))) * gain))
    return out / out.std()

def cells(rng, n, count):
    """seamless cells, `count` across the tile: the distance to the nearest and second-nearest cell centre and the
    nearest cell's number, distances in cells"""
    seeds = rng.random((count, count, 2))
    y, x = (np.mgrid[0:n, 0:n] + 0.5) * count / n
    f1 = np.full((n, n), 9.0); f2 = np.full((n, n), 9.0); owner = np.zeros((n, n), dtype=np.int64)
    cy, cx = np.floor(y).astype(int), np.floor(x).astype(int)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            iy, ix = cy + dy, cx + dx
            s = seeds[iy % count, ix % count]
            d = np.hypot(iy + s[..., 0] - y, ix + s[..., 1] - x)
            nearer = d < f1
            f2 = np.where(nearer, f1, np.minimum(f2, d)); owner = np.where(nearer, (iy % count) * count + ix % count, owner)
            f1 = np.where(nearer, d, f1)
    return f1, f2, owner

def smoothstep(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def unit(x): return (x - x.mean()) / x.std()

def leather(rng, n):
    """pebble grain: cells parted by darker creases, and a faint mottle"""
    f1, f2, owner = cells(rng, n, 96)
    pebble = smoothstep(0.0, 0.45, f2 - f1) * (0.75 + 0.25 * rng.random(96 * 96)[owner])
    return 1 + 0.05 * unit(pebble) + 0.04 * band(rng, n, n / 2, n / 8)

def felt(rng, n):
    """a matte pressed fabric: fine fibre noise, short fibres along one way, and a soft cloudiness"""
    fibre = band(rng, n, 6, 1.5) + 0.6 * band(rng, n, 20, 4, stretch=4.0)
    return 1 + 0.05 * fibre + 0.03 * band(rng, n, n / 6, n / 24)

def stipple(rng, n):
    """moulded plastic grain: small low bumps and a faint unevenness"""
    f1, _, _ = cells(rng, n, 160)
    return 1 + 0.03 * unit(-f1) + 0.02 * band(rng, n, 4, 1.5) + 0.015 * band(rng, n, n / 4, n / 16)

def carpet(rng, n):
    """cut pile: dense tufts of uneven height and a coarser patchiness"""
    tuft = band(rng, n, 5, 1.5)
    return 1 + 0.12 * tuft + 0.05 * band(rng, n, n / 8, n / 32)

# kind: (generator, tile size in metres, pixels across, seed)
KINDS = {'leather': (leather, 0.25, 512, 48), 'felt': (felt, 0.2, 512, 49), 'stipple': (stipple, 0.15, 512, 50),
         'carpet': (carpet, 0.1, 256, 51)}
# Cabin material: the kind of surface it is drawn with
MATERIALS = {'leather': 'leather', 'insert': 'felt', 'headliner': 'felt', 'carpet': 'carpet',
             'dash': 'stipple', 'dashBand': 'stipple', 'darkGrey': 'stipple', 'midGrey': 'stipple',
             'lightGrey': 'stipple', 'frame': 'stipple'}

def srgb(x): return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-9), 1 / 2.4) - 0.055)

for kind, (make, tile, n, seed) in KINDS.items():
    colour = make(np.random.default_rng(seed), n)
    colour = np.clip(colour * MEAN / colour.mean(), 0, 1)
    img = bpy.data.images.new(f'tex_{kind}', n, n, alpha=False); img.colorspace_settings.name = 'Non-Color'
    buf = np.ones((n, n, 4), dtype=np.float32); buf[:, :, :3] = srgb(colour)[::-1, :, None]   # Blender's rows run bottom up
    img.pixels.foreach_set(buf.ravel())
    img.filepath_raw = os.path.join(OUT, f'tex_{kind}.png'); img.file_format = 'PNG'; img.save()
    print(f'WROTE tex_{kind}.png')
with open(os.path.join(OUT, 'textures.json'), 'w') as f:
    json.dump({'kinds': {k: v[1] for k, v in KINDS.items()}, 'materials': MATERIALS}, f, indent=2); f.write('\n')
print('DONE')
