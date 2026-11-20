import bpy, os, json, glob, hashlib, urllib.error, urllib.request
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('CABIN_OUT') or os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
for stale in glob.glob(os.path.join(OUT, 'tex_*.png')) + [os.path.join(OUT, 'textures.json')]:
    if os.path.isfile(stale): os.remove(stale)
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

# kind: (generator, tile size in metres, pixels across, seed)
KINDS = {'leather': (leather, 0.25, 512, 48), 'felt': (felt, 0.2, 512, 49), 'stipple': (stipple, 0.15, 512, 50)}
PHOTOS = {'carpet': {'url': 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/dirty_carpet/dirty_carpet_diff_2k.jpg',
                     'sha256': '6337d3ef1a11ca8bea2d31b86da15a65f10ae92c7f3345fae62924bae194f6c0', 'tile': 0.6, 'px': 512}}
# Cabin material: the kind of surface it is drawn with
MATERIALS = {'leather': 'leather', 'insert': 'felt', 'headliner': 'felt', 'carpet': 'carpet',
             'dash': 'stipple', 'dashBand': 'stipple', 'darkGrey': 'stipple', 'midGrey': 'stipple',
             'lightGrey': 'stipple', 'frame': 'stipple'}

def linear(x): return np.where(x <= 0.04045, x / 12.92, np.power((x + 0.055) / 1.055, 2.4))

def srgb(x): return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-9), 1 / 2.4) - 0.055)

TILES = {}

def write(kind, tile, colour):
    """save a linear grey tile, its rows in Blender's order (bottom up), as tex_<kind>.png"""
    n = colour.shape[0]; TILES[kind] = tile
    img = bpy.data.images.new(f'tex_{kind}', n, n, alpha=False); img.colorspace_settings.name = 'Non-Color'
    buf = np.ones((n, n, 4), dtype=np.float32); buf[:, :, :3] = srgb(colour)[:, :, None]
    img.pixels.foreach_set(buf.ravel())
    img.filepath_raw = os.path.join(OUT, f'tex_{kind}.png'); img.file_format = 'PNG'; img.save()

for kind, (make, tile, n, seed) in KINDS.items():
    colour = make(np.random.default_rng(seed), n)
    write(kind, tile, np.clip(colour * MEAN / colour.mean(), 0, 1)[::-1])
    print(f'WROTE tex_{kind}.png')

def sha256_of(path):
    with open(path, 'rb') as f: return hashlib.sha256(f.read()).hexdigest()

def fetch(url, sha256):
    path = os.path.join(OUT, url.rsplit('/', 1)[1])
    if not (os.path.isfile(path) and sha256_of(path) == sha256):
        request = urllib.request.Request(url, headers={'User-Agent': 'cabin-textures'})
        try:
            with urllib.request.urlopen(request, timeout=60) as r: data = r.read()
        except (urllib.error.URLError, TimeoutError) as e: raise SystemExit(f'{url}: {e}')
        if hashlib.sha256(data).hexdigest() != sha256: raise SystemExit(f'{url}: SHA-256 does not match')
        with open(path, 'wb') as f: f.write(data)
    return path

for kind, photo in PHOTOS.items():
    url, n = photo['url'], photo['px']
    src = bpy.data.images.load(fetch(url, photo['sha256'])); src.colorspace_settings.name = 'Non-Color'
    w, h = src.size; px = np.empty(w * h * 4, dtype=np.float32); src.pixels.foreach_get(px)
    lum = linear(px.reshape(h, w, 4)[:, :, :3]) @ np.array([0.2126, 0.7152, 0.0722])
    f = w // n; lum = lum[:n * f, :n * f].reshape(n, f, n, f).mean((1, 3))
    rel = lum / lum.mean()
    write(kind, photo['tile'], np.clip(rel * min(MEAN, 1 / np.percentile(rel, 99.9)), 0, 1))
    print(f'WROTE tex_{kind}.png from {url}')
with open(os.path.join(OUT, 'textures.json'), 'w') as f:
    json.dump({'kinds': TILES, 'materials': MATERIALS}, f, indent=2); f.write('\n')
print('DONE')
