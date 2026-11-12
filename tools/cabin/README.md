# Cabin asset tools

The scripts that build the **Cabin**'s geometry and baked lighting, and turn a bake into the files under
`public/cabin/`. Why the assets are made this way is in `docs/adr/0012-cabin-assets-built-in-blender-baked-on-kaggle.md`;
measurements and traps are in `docs/map/home-room.md`.

## What you need

- Blender 5.3 (the commands below use `BLENDER=/Applications/Blender.app/Contents/MacOS/Blender`).
- Python 3 and the Kaggle CLI 2.x, signed in, for the bake only. If `kaggle` is not on `PATH`, put its path in `KAGGLE`.

Intermediate files go to `tools/cabin/out/`, which git ignores. Set `CABIN_OUT` to use another directory.

## 1. Preview a shape change locally

```sh
$BLENDER -b --factory-startup --python tools/cabin/cabin.py -- wb
```

Writes seven Workbench previews: `out/wb_home.png` (the page's opening view: same eye, target and 60° height),
`out/wb_front.png` (a centred front view like the maker's rider-guide image, seat backs left out), `out/wb_door.png`
(through the open left door), `out/wb_corner.png` (a close look at where the right A-pillar meets the headliner),
`out/wb_rdoor.png` (the right door from the left seat), `out/wb_side.png` (the right door card square on, the left
side and the seats left out) and `out/wb_dashend.png` (the left end of the dash). No Cycles, a few seconds. Workbench
draws no transparency, so the side glass shows as opaque dark grey there.

It also prints `MEASURE` lines read from the built meshes: the length from the windscreen base to the B-pillar, the
door's length and the sill's height at both ends, the doors' face counts, and which meshes reach into the page's eye
box (`EYE_BOX`, a copy of `EYE_BOUNDS` in `src/lib/cabin-scene.ts`; keep the two the same).

## 2. Bake on Kaggle

```sh
python3 tools/cabin/bake_kaggle.py            # 2048 px, 256 samples
python3 tools/cabin/bake_kaggle.py 1024 64    # a quick look
```

Pushes `cabin.py` to the private GPU kernel named in `bake_kaggle.py`, waits for the run (about two minutes), and
downloads `cabin.glb`, `light_day.hdr`, `light_night.hdr`, the seven views as Cycles day renders (`day_home.png` and
so on) and the run log into `out/`, and removes the denoised lightmaps of the bake before. Both lightmaps use the Cabin's second UV set; the **Cabin Screen** is a separate object
named `Screen` and is not baked, and the side glass is a separate object named `Glass`, left out of the bake and exported
with a see-through material.

## 3. Denoise

```sh
$BLENDER -b --factory-startup --python tools/cabin/denoise.py
```

Writes `out/light_day_dn.hdr` and `out/light_night_dn.hdr`.

## 4. Compress

```sh
$BLENDER -b --factory-startup --python tools/cabin/compress.py
```

Replaces the files in `public/cabin/`:

- `cabin.<hash>.glb`: the scene with Draco mesh compression. The page needs three.js's `DRACOLoader`.
- `light-day.<hash>.webp`, `light-night.<hash>.webp`: each lightmap as 8-bit sRGB-encoded `light / scale`. The page
  loads it as an sRGB texture with `flipY = false` on UV channel 1 and multiplies the lightmap intensity by `scale`.
- `manifest.json`: the current file names and each lightmap's `scale`.

`<hash>` is the first 8 hex digits of the file's SHA-256, so a changed asset always has a new URL. The page reads the
names from the manifest and never hard-codes them.

## 5. Check and commit

```sh
python3 tools/cabin/verify.py
```

Checks that every file in `public/cabin/` is the one the manifest names, that each name matches its content, that
the GLB is Draco-compressed with a `Cabin` mesh carrying lightmap UVs and a separate `Screen` mesh, and that the two
lightmaps are lossy WebP of the same size. Then commit `tools/cabin/` and `public/cabin/` together.
