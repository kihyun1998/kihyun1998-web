---
name: adr-0012-cabin-assets-built-in-blender-baked-on-kaggle
status: accepted
---

# Cabin assets are scripted in Blender, baked on Kaggle by hand, and committed

The **Cabin**'s geometry is a Python script run in headless Blender; its lighting is baked into lightmaps with Cycles, denoised, and drawn in three.js as PBR materials with the lightmap and a reflection of the outside. Shapes are iterated locally with Blender's Workbench renderer; bakes run on a Kaggle GPU notebook pushed with the Kaggle CLI, started by a person when the shapes change. The scripts and the outputs (GLB and lightmaps) are both committed, so building the site needs neither Blender nor a Kaggle account.

## Why

- **Code-built cabins could not look real.** Boxes lit in real time read as toys: no bounced light, no soft shadow, every surface evenly lit. Baked light is what makes the reference site convincing.
- **The Mac cannot bake in reasonable time.** On the M2, Cycles compiled its Metal kernels for over 24 minutes without finishing a preview. On Kaggle (2 × T4, OptiX) a full run — download Blender, two renders, day and night bakes at 2048 px × 256 samples, export — took 85 s. Workbench previews take 0.4–8.5 s locally, which is enough to tune shapes against photos.
- **Committed outputs keep the site reproducible.** A bake depends on Blender's version and a GPU; re-baking in CI would make every build depend on a notebook quota and an account.

Measurements and traps are in `docs/map/home-room.md`.

## Considered and rejected

- *Real-time lighting only*: too fake, and heavier per frame than sampling a lightmap.
- *Baking locally*: blocked by the Metal kernel compile above.
- *Baking in CI*: ties the build to a GPU quota and credentials.
- *Hand modelling in Blender's UI*: not reviewable or repeatable in a pull request; the script is.

## Consequences

- Changing a shape means running the script, re-baking, and committing new assets together; asset URLs carry a version so browsers do not keep the old file.
- Bakes carry Cycles noise and must be denoised before they ship.
