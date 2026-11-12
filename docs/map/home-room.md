# Home room

The planned 3D room home page (issue #13): a full-screen eye-level room whose objects are the navigation, a "living photo" outside the window, light that follows the visitor's time of day. This note holds what was measured while prototyping it on 2026-11-11, and the traps found on the way. Each number says where it came from.

## The reference: felixrieseberg.com

Read from its shipped HTML, CSS and scripts and from network traffic in a real browser.

- **Engine.** three.js r169 (`window.__THREE__` = `169`), WebGL2 on the canvas. A real-time scene, not video or pre-rendered frames.
- **Weight.** First load of the room: 88 requests, about 7.2 MB (sum of `encodedBodySize` over resource entries). Largest: packed geometry `leanm/geo/scene.json`, 3.9 MB; `three.module.js`, 260 KB. Scene assets are served from a separate Cloudflare Pages deploy (`berlin-monitor-scene.pages.dev`); the site itself is Ghost.
- **View control.** three.js `OrbitControls`, not a first-person look: target on the desk at (0.04, 1.1, 0.02), home distance 1.75 m, distance 0.3–2.6 m, azimuth −1.3…1.2 rad, polar 0.95…1.72 rad, `enableDamping` with `dampingFactor` 0.06, pan off, `rotateSpeed` 0.5. A `keepInRoom` function clamps the eye inside the room and out of furniture (`OBST`). Pages fly the camera to an object (`ANCHOR`, `frameFor`, `fly`) and pin their card beside it. At 1.75 m and 74° the eye moves about 1.7 m sideways, which is why the window shows a different part of the city from each angle; confirmed by dragging in the live site.
- **Living photo.** The window view is a photograph, `tex/berlin.jpg`, 3840×3201 (a Wikimedia Commons Berlin skyline). Per the header of `city/lib/living-shader.js`: a fitted camera model (f = 2451 px/rad, horizon at photo row 2090, photographer 12 m above the rails), a cylinder mapping (3840 / 2451 ≈ 1.57 rad ≈ 90° wide), a depth map `city/assets/depth.png` (1022×854) so masts and buildings "move as solid things when the camera does", and shader layers for aircraft, trains, weather and mist. Every animated value is a pure function of absolute time, so a tab hidden for an hour resumes in the right state.
- **Light and materials.** Baked lighting: in the main scene script `bake` appears 37 times, `baked` 24, `lightMap` 7, `aoMap` 4, `roughnessMap` 8, `normalMap` 2. Switching the desk lamp off loads "its own bake (`bake/*_irrD.jpg`) and its own panorama for reflections (`tex/env_off.jpg`)". Post: `AgXToneMapping`, `UnrealBloomPass`, `OutputPass`, `PMREMGenerator`. Whether it uses photographed material textures was not verified: no such images showed in the network list; they may be inside the packed geometry, which was not opened.
- **Loading.** Geometry is meshopt-compressed (`MeshoptDecoder`, `lean/`); a comment notes AVIF and fetching "what home doesn't show after the click" later.
- **Fallback.** Devices judged unsuitable are routed to a static reading page (`?reading=1`; `?room=1` forces the room). Its layout: content 660 px wide; h1 Literata 46/700, body Literata 21, h2 Fira Sans 22/700, metadata in Fira Code, wordmark in Archivo (computed styles, light theme).

## The robotaxi cabin reference

The scene concept moved to the inside of a two-seat robotaxi (no steering wheel, a larger screen). What the real cabin is, from five interior photos (topelectricsuv.com Paris 2026 and Auto Zurich 2026 show cars, a notateslaapp.com press render) and the text of those articles. "Seen" means read off a photo; quotes are article text.

- **Screen.** Freestanding on the centre of the dash, close to upright, roughly 4:3 landscape with a thin black bezel; its lower edge hangs below the dash top line. "a large, freestanding touchscreen" (topelectricsuv, both). Size is given as 20.5" (notateslaapp, 2024 prototype) or 21" (basenor); sources disagree.
- **Dash.** Seen: a thin horizontal stack across the full width: a deep flat top running far forward to the windscreen, a full-width slot with a light strip (lit warm in the render, a pale trim line in the show cars), a dark grey lower fascia. Below it the floor carpet climbs a near-vertical face: "a nearly vertical surface beneath the dashboard, which provides a convenient place to rest my feet" (topelectricsuv). No glovebox.
- **Seats.** Two, set close like a split bench: "broad, horizontally segmented cushions reminiscent of old-school American lounge chairs" (topelectricsuv). Seen: separate tall headrests, one horizontal seam across the backrest, two across the cushion, a floating centre armrest, two recessed cup holders in a console between the cushions in front of it. Show cars are dark grey leather; the render and the 2024 prototype ("only shown the white interior … with black trim", notateslaapp) are light.
- **Roof and overhead.** "There is no panoramic glass roof" (topelectricsuv). Seen: light grey headliner, an overhead pod at the top of the windscreen, two dome lights with a stop button between them ("A Stop button between the dome lights", topelectricsuv Zurich).
- **Doors and trim.** Dihedral doors (articles disagree on the word). Seen: light grey moulded door panels with a sculpted pull, wide light grey A-pillars, dark grey flat carpet over an open floor. Window switches: "two window switches located under the touchscreen".
- **Glass.** Tint is not stated anywhere; the render shows warm amber light through the glass, the show-car photos show clear glass.
- **Dimensions.** Width 69 in, height 55.4 in (topelectricsuv); headroom 38.3 in, legroom 43.4 in, U.S. spec (topelectricsuv Zurich). Length unpublished.
- **What v9 (2026-11-11) got wrong against this:** a wide flat screen on a stalk instead of an upright 4:3 one hanging in front of the dash; no light-strip slot; no carpeted footwell face; seats with no headrests and no seam pattern; amber glass the show cars do not have.

## Baking the cabin in Blender

The cabin is modelled by a Python script run in headless Blender 5.3.0, which also bakes a diffuse lightmap (direct + indirect, no colour) into a second UV set and exports GLB + an HDR lightmap. The web page shows each cabin surface as unlit colour × lightmap, scaled per time of day.

- **Local Mac (M2, Metal, 8 GPU cores): unusable for a first run.** Cycles compiled its Metal kernels for over 24 minutes (two `MTLCompilerService` processes busy, Blender itself idle) without finishing a 1280×720 preview; the run was stopped. The compile is said to be cached after the first run; that was not measured.
- **Kaggle notebook (2 × Tesla T4, OptiX), measured 2026-11-11:** environment setup (download 407 MB Linux Blender, unpack) 29–31 s; 1280×720 preview at 64 samples 11.5–13.8 s; lightmap bake 1024 px × 64 samples 2.9 s, 2048 px × 256 samples 14.2–14.4 s; whole run 62–78 s. Output: GLB 2.6 MB (44,514 faces), HDR lightmap 10.6 MB at 2048 px.
- **Shape iteration runs locally in Workbench.** The Workbench engine needs no Cycles kernels: two 1280×720 previews took 1.2–8.5 s and 0.4–2.6 s on the M2 (the first render of a run is the slow one). Shapes are tuned against the photos there; only the bake goes to Kaggle.
- **Second pass, day + night bake (Kaggle, 2026-11-11):** two 1280×720 Cycles renders 10.4–13.2 s each; day and night lightmaps 2048 px × 256 samples 14.1 s and 14.2 s; whole run 85 s; GLB 2.7 MB (45,191 faces). The night bake lights the cabin only with the dash strip, the dome lights and one warm area light standing in for a street lamp; in the page the night lightmap needed 2.4× intensity to read.
- **Bake noise reads as concrete.** Cycles does not denoise a bake; at 256 samples the speckle on large flat panels made every surface look like cement. Fixed by running OIDN on the baked HDR through the compositor (local, CPU, 0.8–2.4 s per 2048 px map); a side-by-side crop showed the grain gone with shadow edges and panel seams kept.
- **Flat unlit shading also read as concrete.** Drawing the cabin as colour × lightmap (`MeshBasicMaterial`) gave leather, plastic and gloss trim the same chalky look. The cabin now has its own scene with no direct lights, glTF PBR materials (Blender's roughness: leather 0.42, dash 0.5, panels 0.6, gloss trim 0.15), the lightmap at intensity × π, and reflections from a PMREM capture of the street, re-captured on phase change. It is drawn over the outside pass with a shared depth buffer (`RenderPass.clear = false`).
- **Trap: the browser kept the old lightmap.** Replacing an asset under the same URL left the noisy one in the browser cache, so the denoised map seemed to change nothing. Version the asset URL (`?v=…`) whenever an asset is replaced.
- **Kaggle CLI auth:** the Mac holds the newer OAuth token (`~/.kaggle/credentials.json`). Kaggle CLI 1.7.4 (the newest pip installs on the system Python 3.9) only reads `kaggle.json` and fails; Kaggle CLI 2.2.5 on Python 3.14 reads it, after adding the missing `six` dependency.
- **Trap: a mesh created by `primitive_*_add` stays selected.** Joining "the static parts" with `object.join()` swallowed the screen plane too, and the export then failed with `StructRNA of type Object has been removed`. Deselect all before selecting what to join.
- **Trap: texture orientation for glTF.** The lightmap must load with `flipY = false`; with three.js's default `true` it reads as random dark blotches. The Blender screen plane's UVs also run opposite to a three.js `PlaneGeometry`, so its canvas texture needs `flipY = false` and picking reads `uv.y` unflipped.
- **Trap: clamping the orbiting camera.** Pulling the controls' own camera back inside the cabin feeds into the controls and shrinks the orbit each time it touches a wall, which looks like zooming into the screen during a drag. Draw from a copy (the reference site does the same: `view.copy(camera); keepInRoom(view.position, …)`), and size the orbit limits so the clamp normally never acts: after resizing them, the drawn camera stayed within 5.6 mm (the road sway) of the controls' camera across six full-range drags.

## Measuring in the automation browser

- **Frame rate cannot be measured there.** The ego-browser tab ran `requestAnimationFrame` at 4 per second even with nothing to draw (counted over 1.5 s, tab visible and focused). Every fps figure read in that tab measured the throttle, not the scene. Frame time right after a scripted click or drag also dropped to 1–11 fps and recovered.
- **What works instead:** render one frame, force the GPU to finish with a one-pixel `readPixels`, time it, repeat ~40–70 times, take the median, and subtract the same timing for an empty scene. The empty-scene floor was 52 ms in one session and about 0.5 ms in later ones, so always measure the floor in the same run. Results still varied run to run by up to ±3 ms, and once from 5.3 to 12.3 ms within three runs: treat single figures as rough.

## Prototype render cost

Median ms per frame above the floor, pixel ratio 1.5, 1470×729 viewport, Apple M2, measured with the method above.

| Room | Day | Night | Notes |
|---|---|---|---|
| Empty room, before optimisation (pixel ratio 2) | ≈ 21 | ≈ 24 | shadow map redrawn every frame, VSM blur, full-res bloom always on |
| Empty room, after | ≈ 3 | ≈ 10 | shadows redrawn only on phase change, bloom off by day and half-res at night |
| Penthouse (900 instanced towers, two window area lights) | 9.4–10 | 13.6–14.6 | night barely moved when bloom went to 1/3 resolution: the cost is elsewhere |
| First hanok (code-built yard, trees, wall) | 6.3–7.5 | 10.6–11.9 | night with bloom at 1/3 resolution (13.1–14 at 1/2) |
| Modern hanok with living photo, no shadow map, no bloom | 5.6–8.9 | 5.3–12.3 | inconclusive against the first hanok; also redraws ~30 times a second while idle for the backdrop's motion |

The developer's den variant (six area lights, bloom always on) was dropped because Kihyun found it too slow; its cost was not measured.

## Traps

- **Turning in place freezes the window.** With the eye fixed and only rotation, the window is a fixed aperture: it shows the same slice of the outside from every angle. The prototypes moved the eye at most 18 cm, so the outside read as a poster. The reference orbits instead (above).
- **The pixel-ratio governor must ignore deliberately spaced frames.** Idle backdrop frames are 33 ms apart on purpose; fed into a "frames are slow" average they step the resolution down for nothing. Only back-to-back frames during movement say anything about speed.
- **Update the camera's world matrix before projecting labels or picking.** Setting `camera.rotation` does not update `matrixWorld` until the next render; projecting a label right after placed it at the previous frame's position (seen as a tag at (308, 65) instead of over the model).
- **`all: unset` after positioning properties wipes them.** It must come first in a rule.
- **AgX tone mapping flattens a photograph.** The living-photo room switched to neutral tone mapping to keep the photo's colours.
- **transformers.js `toCanvas()` returns an `OffscreenCanvas`** (v3.0.2), which has no `toDataURL`; draw it into a regular canvas first.
- **Wikimedia's API rate-limits bursts.** About 20 search requests in quick succession were refused ("You are making too many requests"). Space requests or use the dumps.

## Assets tried

- **Polyfork** (polyfork.dev): 3,205 low-poly GLB models; free mesh files under CC BY 4.0 (credit Polyfork, say if changed) or the Polyfork licence (no credit, no redistribution). A site serving the GLB files redistributes them, so CC BY applies. Served from its CDN with `access-control-allow-origin: *`; the desk monitor GLB is 36,936 bytes. The Open Plan kit has 63 room parts on one palette and scale. No Tesla or other EV model in the catalogue (searched `tesla`, `cyber`, `electric`).
- **Window photograph:** "Sobaeksan as seen from Woraksan Yeongbong Peak (7)", Wikimedia Commons, CC0, 3648×2056. Shot from a summit, so its horizon does not match a seated room's eye height; a fitted camera or a photo taken nearer eye height is still needed.
- **Depth map:** Depth Anything V2 small (`onnx-community/depth-anything-v2-small`) through transformers.js 3.0.2 in the browser: 1280×721 in about 7 s on the M2. Output is near-bright, far-dark, the same convention as the reference's `depth.png`.

## Why the prototypes read as fake

An analysis, not a measurement, kept here as the checklist for the Blender pass: colour-only procedural textures with no normal, roughness or AO maps; no bounced or baked light, so every surface is evenly lit; razor-sharp, perfectly regular geometry; a photograph whose viewpoint does not match the room, on a flat card with no fitted camera; no brightness gap between the bright outside and the darker inside; night made by grading a day photograph.
