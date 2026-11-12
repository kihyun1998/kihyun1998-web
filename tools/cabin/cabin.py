# The Cabin: geometry, Workbench previews, day and night lightmap bakes, GLB export. Run in headless Blender:
#   blender -b --factory-startup --python cabin.py -- wb                          two Workbench previews (no Cycles)
#   blender -b --factory-startup --python cabin.py -- bake [size] [samples]       Cycles: two day renders, day + night
#                                                                                 diffuse lightmaps, cabin.glb
# Output goes to $CABIN_OUT, or to out/ beside this file.
# Blender axes: x right, y forward, z up. glTF export maps (x, y, z) -> three.js (x, z, -y).
import bpy, bmesh, math, time, os, sys
from mathutils import Vector, Quaternion

OUT = os.environ.get('CABIN_OUT') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = args[0] if args else 'wb'
SIZE = int(args[1]) if len(args) > 1 else 2048
SAMPLES = int(args[2]) if len(args) > 2 else 256
if MODE not in ('wb', 'bake'): sys.exit(f'unknown mode {MODE!r}: use wb or bake')

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
def mat(name, hexc, rough=0.6, metal=0.0, emit=None):
    m = bpy.data.materials.new(name)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(hexc), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*lin(emit), 1); b.inputs['Emission Strength'].default_value = 0.0
    m.diffuse_color = (*lin(hexc), 1)   # Workbench uses this
    return m
M = {
    'lightGrey': mat('lightGrey', '#b9bbbd', 0.6), 'headliner': mat('headliner', '#c3c4c4', 0.95),
    'darkGrey': mat('darkGrey', '#2d2e31', 0.5), 'midGrey': mat('midGrey', '#55575b', 0.45),
    'leather': mat('leather', '#3b3d40', 0.42), 'carpet': mat('carpet', '#3a3b3e', 1.0),
    'piano': mat('piano', '#0b0b0d', 0.15, 0.3), 'strip': mat('strip', '#d9d2c6', 0.4, emit='#ffd9a8'),
    'dome': mat('dome', '#e8e6e1', 0.5, emit='#fff1dc'), 'red': mat('red', '#7d1d1d', 0.4),
    'screen': mat('screen', '#08080a', 0.2),
}
static = []
def finish(o, material, bevel=0.0, sub=0, keep=True, smooth=True):
    sc.collection.objects.link(o); o.data.materials.append(M[material])
    if bevel: md = o.modifiers.new('bv', 'BEVEL'); md.width = bevel; md.segments = 4; md.limit_method = 'ANGLE'; md.harden_normals = True
    if sub: md = o.modifiers.new('ss', 'SUBSURF'); md.levels = md.render_levels = sub
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    if keep: static.append(o)
    return o
def mesh_from(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); return bpy.data.objects.new(name, me)
def box(name, size, loc, material, bevel=0.01, sub=0, rot=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    o = finish(mesh_from(name, bm), material, bevel, sub); o.location = loc
    if rot is not None: o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = rot
    return o
def extrude(name, profile, axis, a0, a1, material, bevel=0.008, sub=0):
    """closed 2-D profile swept along one axis. axis 'x': profile is (y, z); 'y': profile is (x, z)"""
    bm = bmesh.new()
    def P(u, v, a): return (a, u, v) if axis == 'x' else (u, a, v)
    A = [bm.verts.new(P(u, v, a0)) for u, v in profile]; B = [bm.verts.new(P(u, v, a1)) for u, v in profile]
    n = len(profile); bm.faces.new(A[::-1]); bm.faces.new(B)
    for i in range(n): j = (i + 1) % n; bm.faces.new((A[i], A[j], B[j], B[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(mesh_from(name, bm), material, bevel, sub)
def band(name, p0, p1, width, thick, inward, material):
    """a flat strip from p0 to p1, its wide face turned toward `inward`"""
    d = (p1 - p0); L = d.length; z = d.normalized()
    x = inward.cross(z).normalized(); y = z.cross(x)
    from mathutils import Matrix
    rot = Matrix((x, y, z)).transposed().to_quaternion()
    return box(name, (width, thick, L), (p0 + p1) / 2, material, 0.012, 1, rot)

# ---------- dimensions ----------
CW = 1.6; X1 = CW / 2
FLOOR, ROOF, BELT = 0.2, 1.36, 0.84
DASH_Y, DASH_Z = 0.98, 0.74         # dash lip (y) and top (z)
WS_Y = 1.78                          # windscreen base, far forward
ROOF_Y = 0.72                        # front edge of the roof

# floor and partition
box('floor', (CW, 2.7, 0.04), (0, 0.4, FLOOR), 'carpet', 0.005)
box('partition', (CW - 0.02, 0.06, 1.05), (0, -0.82, FLOOR + 0.5), 'darkGrey', 0.02)
# footwell: carpet climbing in a long slope to the underside of the dash
extrude('footwell', [(DASH_Y + 0.18, FLOOR + 0.01), (DASH_Y + 0.75, FLOOR + 0.01), (DASH_Y + 0.75, DASH_Z - 0.15), (DASH_Y + 0.5, DASH_Z - 0.15),
                     (DASH_Y + 0.3, FLOOR + 0.12)], 'x', -X1 + 0.02, X1 - 0.02, 'carpet', 0.04, 1)
extrude('dashUnder', [(DASH_Y + 0.17, DASH_Z - 0.15), (DASH_Y + 0.75, DASH_Z - 0.15), (DASH_Y + 0.75, DASH_Z - 0.13), (DASH_Y + 0.17, DASH_Z - 0.13)],
        'x', -X1, X1, 'darkGrey', 0.004)
# dash: thin layered shelf — rounded lip, light slot, dark fascia stepping back
extrude('dashTop', [(DASH_Y - 0.005, DASH_Z - 0.02), (DASH_Y + 0.03, DASH_Z + 0.005), (WS_Y, DASH_Z + 0.02), (WS_Y, DASH_Z - 0.02), (DASH_Y + 0.06, DASH_Z - 0.035)],
        'x', -X1, X1, 'darkGrey', 0.01)
extrude('dashSlot', [(DASH_Y + 0.025, DASH_Z - 0.065), (DASH_Y + 0.12, DASH_Z - 0.065), (DASH_Y + 0.12, DASH_Z - 0.035), (DASH_Y + 0.025, DASH_Z - 0.035)],
        'x', -X1 + 0.01, X1 - 0.01, 'piano', 0.002)
extrude('dashStrip', [(DASH_Y + 0.02, DASH_Z - 0.056), (DASH_Y + 0.04, DASH_Z - 0.056), (DASH_Y + 0.04, DASH_Z - 0.046), (DASH_Y + 0.02, DASH_Z - 0.046)],
        'x', -X1 + 0.06, X1 - 0.06, 'strip', 0.002)
extrude('dashFascia', [(DASH_Y + 0.02, DASH_Z - 0.07), (DASH_Y + 0.14, DASH_Z - 0.07), (DASH_Y + 0.18, DASH_Z - 0.14), (DASH_Y + 0.06, DASH_Z - 0.14)],
        'x', -X1, X1, 'darkGrey', 0.012)
# doors: a moulded card swept front to back — storage bulge low, recess, armrest ledge, up to the belt line
for s in (-1, 1):
    prof = [(s * (X1 + 0.03), FLOOR), (s * (X1 - 0.02), FLOOR), (s * (X1 - 0.07), FLOOR + 0.1), (s * (X1 - 0.07), FLOOR + 0.26),
            (s * (X1 - 0.03), FLOOR + 0.32), (s * (X1 - 0.03), BELT - 0.2), (s * (X1 - 0.1), BELT - 0.15), (s * (X1 - 0.1), BELT - 0.11),
            (s * (X1 - 0.03), BELT - 0.07), (s * (X1 - 0.02), BELT + 0.01), (s * (X1 + 0.03), BELT + 0.01)]
    if s < 0: prof = prof[::-1]
    extrude(f'door{s}', prof, 'y', -0.78, WS_Y, 'lightGrey', 0.012, 1)   # runs forward to the windscreen, closing the footwell sides
    box(f'doorBin{s}', (0.03, 1.0, 0.13), (s * (X1 - 0.075), 0.15, FLOOR + 0.18), 'darkGrey', 0.01, 1)
    box(f'pull{s}', (0.04, 0.42, 0.04), (s * (X1 - 0.11), 0.25, BELT - 0.13), 'midGrey', 0.015, 1)
    # A-pillar: a wide light grey band from the dash corner up to the roof
    band(f'apillar{s}', Vector((s * (X1 - 0.03), WS_Y - 0.02, DASH_Z + 0.02)), Vector((s * (X1 - 0.13), ROOF_Y, ROOF - 0.02)), 0.16, 0.035, Vector((-s, -0.4, 0)), 'lightGrey')
    band(f'bpillar{s}', Vector((s * (X1 - 0.02), -0.62, BELT)), Vector((s * (X1 - 0.12), -0.52, ROOF - 0.02)), 0.14, 0.04, Vector((-s, 0.3, 0)), 'lightGrey')
    box(f'roofRail{s}', (0.12, ROOF_Y + 0.85, 0.06), (s * (X1 - 0.12), (ROOF_Y - 0.85) / 2, ROOF), 'lightGrey', 0.02, 1)
# roof: headliner, header over the windscreen, overhead pod, two dome lights with the stop button between them
box('headliner', (CW - 0.18, ROOF_Y + 0.85, 0.04), (0, (ROOF_Y - 0.85) / 2, ROOF + 0.02), 'headliner', 0.015, 1)
box('header', (CW - 0.14, 0.1, 0.05), (0, ROOF_Y, ROOF - 0.01), 'lightGrey', 0.02, 1)
box('pod', (0.24, 0.12, 0.06), (0, ROOF_Y - 0.04, ROOF - 0.04), 'darkGrey', 0.025, 1)
for s in (-1, 1): box(f'dome{s}', (0.12, 0.07, 0.012), (s * 0.12, 0.05, ROOF - 0.002), 'dome', 0.01)
box('stop', (0.04, 0.04, 0.012), (0, 0.05, ROOF - 0.005), 'red', 0.01)
# seats: broad, horizontally segmented; separate headrests; floating armrest; two cup holders ahead of it
SEAT_Z = 0.5
def seat(x):
    for i, (y, w) in enumerate([(0.1, 0.16), (-0.07, 0.17), (-0.24, 0.16)]):
        box(f'cush{x}{i}', (0.6, w, 0.13), (x, y, SEAT_Z - 0.06), 'leather', 0.035, 2)
    tilt = Quaternion((1, 0, 0), math.radians(-12))
    for i, (z, h) in enumerate([(SEAT_Z + 0.2, 0.32), (SEAT_Z + 0.52, 0.32)]):
        box(f'back{x}{i}', (0.6, 0.14, h), (x, -0.4 - (z - SEAT_Z) * 0.21, z), 'leather', 0.04, 2, tilt)
    box(f'head{x}', (0.3, 0.11, 0.2), (x, -0.6, SEAT_Z + 0.82), 'leather', 0.05, 2, tilt)
    box(f'base{x}', (0.5, 0.46, SEAT_Z - FLOOR - 0.12), (x, -0.08, (SEAT_Z - 0.12 + FLOOR) / 2), 'darkGrey', 0.02)
seat(-0.39); seat(0.39)
box('console', (0.18, 0.26, 0.05), (0, 0.1, SEAT_Z - 0.09), 'darkGrey', 0.015)
for y in (0.14, 0.05):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.034, depth=0.03, location=(0, y, SEAT_Z - 0.065)); c = bpy.context.object
    c.data.materials.append(M['piano']); static.append(c)
box('armrest', (0.17, 0.42, 0.07), (0, -0.2, SEAT_Z + 0.16), 'leather', 0.03, 2)
box('armPost', (0.04, 0.06, 0.16), (0, -0.36, SEAT_Z + 0.06), 'darkGrey', 0.012)
# the screen: ~21 in, 4:3, freestanding on the dash with its lower edge below the dash line; kept out of the bake
SW, SH = 0.43, 0.32; SCY, SCZ = DASH_Y - 0.035, DASH_Z - 0.06 + SH / 2
box('screenMount', (0.08, 0.07, 0.05), (0, DASH_Y + 0.0, DASH_Z - 0.02), 'darkGrey', 0.012)
box('screenBezel', (SW + 0.014, 0.02, SH + 0.014), (0, SCY + 0.012, SCZ), 'piano', 0.005)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, SCY, SCZ), rotation=(math.radians(90), 0, 0))
scr = bpy.context.object; scr.name = 'Screen'; scr.scale = (SW, SH, 1); scr.data.materials.append(M['screen'])
scr.select_set(False)

# ---------- cameras: the web's home seat, and a view from the open left door like the show-car photos ----------
def camera(name, loc, target, fov):
    c = bpy.data.objects.new(name, bpy.data.cameras.new(name)); sc.collection.objects.link(c)
    c.data.lens_unit = 'FOV'; c.data.angle = math.radians(fov); c.location = loc
    c.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return c
HOME = camera('home', (-0.38, -0.18, 1.22), (0.0, 0.95, 0.72), 74)
DOOR = camera('door', (-1.15, -0.55, 1.08), (0.25, 0.95, 0.62), 70)

if MODE == 'wb':
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.show_cavity = True
    sc.display.shading.show_object_outline = False
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720; sc.view_settings.exposure = 1.6
    sc.world = bpy.data.worlds.new('wb'); sc.world.color = (0.75, 0.78, 0.82)
    for c in (HOME, DOOR):
        # the photos are taken through the open left door: hide that door for the door view
        for o in bpy.data.objects:
            if o.name in ('door-1', 'doorBin-1', 'pull-1', 'bpillar-1', 'roofRail-1'): o.hide_render = (c is DOOR)
        sc.camera = c; sc.render.filepath = os.path.join(OUT, f'wb_{c.name}.png')
        t = time.time(); bpy.ops.render.render(write_still=True); print(f'TIME wb_{c.name}_s {time.time() - t:.2f}')
    sys.exit(0)

# ---------- Cycles ----------
sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
for kind in ('OPTIX', 'CUDA', 'METAL'):
    try: prefs.compute_device_type = kind; prefs.get_devices()
    except Exception: continue
    if any(d.type == kind for d in prefs.devices): break
for d in prefs.devices: d.use = (d.type == prefs.compute_device_type)
print('DEVICE', prefs.compute_device_type, [d.name for d in prefs.devices if d.use])
sc.cycles.device = 'GPU'; sc.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('w'); sc.world = world
nt = world.node_tree; bg = nt.nodes['Background']
sky = nt.nodes.new('ShaderNodeTexSky')
try: sky.sun_elevation = math.radians(40); sky.sun_rotation = math.radians(140)
except Exception: pass
nt.links.new(sky.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.6
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 4; sun.data.angle = math.radians(3); sun.rotation_euler = (math.radians(50), 0, math.radians(140))

sc.camera = HOME; sc.render.resolution_x, sc.render.resolution_y = 1280, 720; sc.cycles.samples = 64; sc.cycles.use_denoising = True
for c in (HOME, DOOR):
    sc.camera = c; sc.render.filepath = os.path.join(OUT, f'day_{c.name}.png')
    t = time.time(); bpy.ops.render.render(write_still=True); print(f'TIME render_{c.name}_s {time.time() - t:.1f}')

# join the static cabin, lightmap UVs
bpy.ops.object.select_all(action='DESELECT')
for o in static: o.select_set(True)
bpy.context.view_layer.objects.active = static[0]
bpy.ops.object.convert(target='MESH'); bpy.ops.object.join(); cabin = bpy.context.object; cabin.name = 'Cabin'
uv = cabin.data.uv_layers.new(name='Lightmap'); cabin.data.uv_layers.active = uv
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004); bpy.ops.object.mode_set(mode='OBJECT')

def bake(tag):
    img = bpy.data.images.new(f'light_{tag}', SIZE, SIZE, float_buffer=True)
    for m in cabin.data.materials:
        n = m.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; m.node_tree.nodes.active = n
        u = m.node_tree.nodes.new('ShaderNodeUVMap'); u.uv_map = 'Lightmap'; m.node_tree.links.new(u.outputs['UV'], n.inputs['Vector'])
    sc.cycles.samples = SAMPLES; sc.render.bake.margin = 8
    sc.render.bake.use_pass_direct = True; sc.render.bake.use_pass_indirect = True; sc.render.bake.use_pass_color = False
    t = time.time(); bpy.ops.object.bake(type='DIFFUSE'); print(f'TIME bake_{tag}_s {time.time() - t:.1f} size {SIZE} samples {SAMPLES}')
    img.filepath_raw = os.path.join(OUT, f'light_{tag}.hdr'); img.file_format = 'HDR'; img.save()
    for m in cabin.data.materials:
        for n in [n for n in m.node_tree.nodes if n.type in ('TEX_IMAGE', 'UVMAP')]: m.node_tree.nodes.remove(n)

bake('day')
# night: a dark blue sky, no sun, the dash strip and dome lights on, a warm street lamp passing on the right
bg.inputs['Strength'].default_value = 0.02; sun.hide_render = True
M['strip'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 6
M['dome'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 1.5
lamp = bpy.data.objects.new('street', bpy.data.lights.new('street', 'AREA')); sc.collection.objects.link(lamp)
lamp.data.energy = 120; lamp.data.size = 1.0; lamp.data.color = (1.0, 0.75, 0.45); lamp.location = (3.0, 0.6, 4.0)
lamp.rotation_euler = (Vector((0, 0.3, 0.8)) - lamp.location).to_track_quat('-Z', 'Y').to_euler()
bake('night')
for k in ('strip', 'dome'): M[k].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0

bpy.ops.object.select_all(action='DESELECT')
for o in (cabin, scr): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'cabin.glb'), use_selection=True, export_format='GLB', export_yup=True, export_texcoords=True, export_apply=True)
print('DONE', len(cabin.data.polygons), 'faces')
