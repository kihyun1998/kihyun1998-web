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

Writes ten Workbench previews: `out/wb_home.png` (the page's opening view: same eye, target and 60° height),
`out/wb_left.png` and `out/wb_right.png` (the orbit's left and right limits at the opening view's height; these three
hide the seat backs the page hides from that eye, by `SEAT_BACK_NEAR`, a copy of the page's; keep the two the same),
`out/wb_front.png` (a centred front view like the maker's rider-guide image, seat backs left out), `out/wb_door.png`
(through the open left door), `out/wb_corner.png` (a close look at where the right A-pillar meets the headliner),
`out/wb_rdoor.png` (the right door from the left seat), `out/wb_side.png` (the right door card square on, the left
side, the body and the seats left out), `out/wb_dashend.png` (the left end of the dash) and `out/wb_outside.png` (the
front three-quarter view of the maker's exterior image, for the hood and fenders). No Cycles, a few seconds. Workbench
draws no transparency, so the side glass shows as opaque dark grey there.

It also prints `MEASURE` lines read from the built meshes: the length from the windscreen base to the B-pillar, the
door's length and the sill's height at both ends, the doors' face counts, how many faces of the dash slab's end caps the
triangulation left out (0 is right), and which meshes reach into the page's eye
box (`EYE_BOX`, a copy of `EYE_BOUNDS` in `src/lib/cabin-scene.ts`; keep the two the same), listing apart the seat-back
parts, which the page hides while the eye is near them.

## 2. Look at how the lightmap is shared out

```sh
$BLENDER -b --factory-startup --python tools/cabin/cabin.py -- uv
```

Joins the Cabin and lays out its lightmap UVs as the bake does, without Cycles (about three and a half minutes on an M2), and prints `MEASURE`
lines: how much of the map is covered, how much of the Cabin's area the page's eye never sees and what share of the map
that takes, and for each part its area, the share of it that is seen, the nearest eye that sees it, its share of the
map and its texel size. What the eye can see comes from the orbit the page fits in `EYE_BOX` round `ORBIT_C` with `ORBIT_MARGIN`, the zoom
to the screen (`ZOOM_D`), the opening view's angles in `page_eyes`, `SEAT_BACK_NEAR`, the view's `FOV` and `MIN_FOV_ACROSS`
and the sway (`SWAY`), all copies of the page's; keep them the same. `ASPECTS` is the range of window shapes the eyes
cover. Why the map is shared this way: `docs/map/home-room.md`, "The lightmap goes to what the seat sees" and "The
layout gets the room #32 left".

## 3. Bake on Kaggle

```sh
python3 tools/cabin/bake_kaggle.py            # 2048 px, 256 samples
python3 tools/cabin/bake_kaggle.py 1024 64    # a quick look
```

Pushes `cabin.py` to the private GPU kernel named in `bake_kaggle.py`, waits for the run, and
downloads `cabin.glb`, `light_day.hdr`, `light_night.hdr`, `light_ambient.hdr`, the ten views as Cycles day renders (`day_home.png` and
so on) and the run log into `out/`, and removes the denoised lightmaps of the bake before. Each HDR holds the baked
light as Cycles computed it, linear, with no colour curve. `light_ambient.hdr` is the night's ambient layer alone: the
footwell light under the dash, the door bars and the dash strip, baked in white with every other light off, which the
page multiplies by the ambient colour and strength and adds to the night lightmap. All three lightmaps use the Cabin's second UV set; the **Cabin Screen** is a separate object
named `Screen` and is not baked, and the side glass is a separate object named `Glass`, left out of the bake and exported
with a see-through material. Each seat's back, headrest and headrest posts are baked as part of the Cabin and then split
off it into `SeatBackLeft` and `SeatBackRight`, which keep the Cabin's lightmap UVs and read the same lightmaps.

## 4. Denoise

```sh
$BLENDER -b --factory-startup --python tools/cabin/denoise.py
```

Writes `out/light_day_dn.hdr`, `out/light_night_dn.hdr` and `out/light_ambient_dn.hdr`.

## 5. Make the surface textures

```sh
$BLENDER -b --factory-startup --python tools/cabin/textures.py
```

Writes `out/tex_<kind>.png`, one seamless grey tile for each kind of surface (leather, felt, stipple, carpet), and
`out/textures.json`: each kind's tile size in metres and which kind each Cabin material is drawn with (it runs in Blender for its numpy and its image reader and writer, and removes the tiles and `textures.json` of the run before, so a failed run leaves none). Leather, felt
and stipple are made from seeded noise. The carpet is made from a photo: Poly Haven's `dirty_carpet` (by Rohit Seervi,
CC0), whose 2k colour map the script downloads into `out/` and checks against its SHA-256 before using it, so the first
run needs the network. A few seconds; the tiles do not depend on the bake. Why they are made this way:
`docs/map/home-room.md`, "The materials' surface textures" and "The sharp sun, the grilles and the photo carpet".

## 6. Compress

```sh
$BLENDER -b --factory-startup --python tools/cabin/compress.py
```

Replaces the files in `public/cabin/`:

- `cabin.<hash>.glb`: the scene with Draco mesh compression. The page needs three.js's `DRACOLoader`.
- `light-day.<hash>.avif`, `light-night.<hash>.avif`, `light-ambient.<hash>.avif`: each lightmap's linear light divided by `scale`, with the sRGB
  curve applied three times, in 8 bits (the manifest's `encoding`, `srgb-thrice`), as AVIF at quality 90. The page loads it as an sRGB texture
  with `flipY = false` on UV channel 1, decodes the sampled value from sRGB twice more in the shader, and multiplies
  the lightmap intensity by `scale`. At night it adds the ambient layer, decoded the same way, times its `scale`, the
  night's level, the ambient strength and the ambient colour (`AMBIENT_COLOUR` in `src/lib/cabin-scene.ts`). Why three times: `docs/map/home-room.md`, "The lightmaps hold linear light"; why AVIF: "The lightmap goes to what the seat sees".
- `tex-<kind>.<hash>.avif`: each surface tile, as AVIF at quality 80. The page loads it as an sRGB texture and draws it
  projected along the three world axes, `1 / tile` tiles to a metre (the GLB has no texture UVs), on the materials
  `surfaces` names, their base colour divided by the tile's `mean`.
- `manifest.json`: the current file names, each lightmap's `scale` and `encoding`, each surface tile's `tile` (metres)
  and `mean` (the stored file's linear mean), and `surfaces`, the tile each material is drawn with.

`<hash>` is the first 8 hex digits of the file's SHA-256, so a changed asset always has a new URL. The page reads the
names from the manifest and never hard-codes them.

## 7. Check and commit

```sh
python3 tools/cabin/verify.py
```

Checks that every file in `public/cabin/` is the one the manifest names, that each name matches its content, that
the GLB is Draco-compressed with a `Cabin` mesh and `SeatBackLeft` and `SeatBackRight` meshes carrying lightmap UVs
and a separate `Screen` mesh, that the lightmaps are day, night and the ambient layer, all
AVIF of the same size, with `srgb-thrice` named as each one's encoding in the manifest, and that each surface
tile is AVIF with a positive tile size and a mean in (0, 1], is used by some surface, and that every surface is a
material of the GLB and names a listed tile. Then commit `tools/cabin/` and `public/cabin/` together.
