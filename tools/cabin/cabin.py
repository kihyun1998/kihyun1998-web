# The Cabin: geometry, Workbench previews, day and night lightmap bakes, GLB export. Run in headless Blender:
#   blender -b --factory-startup --python cabin.py -- wb                          four Workbench previews (no Cycles)
#   blender -b --factory-startup --python cabin.py -- bake [size] [samples]       Cycles: four day renders, day + night
#                                                                                 diffuse lightmaps, cabin.glb
# Output goes to $CABIN_OUT, or to out/ beside this file.
# Blender axes: x right, y forward, z up. glTF export maps (x, y, z) -> three.js (x, z, -y).
import bpy, bmesh, math, time, os, sys
from mathutils import Vector, Matrix

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
def mat(name, hexc, rough=0.6, metal=0.0, emit=None, alpha=1.0):
    m = bpy.data.materials.new(name)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(hexc), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*lin(emit), 1); b.inputs['Emission Strength'].default_value = 0.0
    if alpha < 1: b.inputs['Alpha'].default_value = alpha; m.surface_render_method = 'BLENDED'
    m.diffuse_color = (*lin(hexc), alpha)   # Workbench uses this
    return m
M = {
    'lightGrey': mat('lightGrey', '#959595', 0.65), 'headliner': mat('headliner', '#bcbcbc', 0.95),
    'dash': mat('dash', '#595959', 0.6), 'dashBand': mat('dashBand', '#787878', 0.6), 'darkGrey': mat('darkGrey', '#4a4a4a', 0.55), 'midGrey': mat('midGrey', '#6c6c6c', 0.45),
    'leather': mat('leather', '#434343', 0.42), 'carpet': mat('carpet', '#565656', 1.0),
    'piano': mat('piano', '#111111', 0.15, 0.3), 'strip': mat('strip', '#d9d2c6', 0.4, emit='#ffd9a8'),
    'dome': mat('dome', '#e8e6e1', 0.5, emit='#fff1dc'), 'red': mat('red', '#7d1d1d', 0.4),
    'screen': mat('screen', '#08080a', 0.2),
    'body': mat('body', '#6f5c3c', 0.35, 0.3), 'glass': mat('glass', '#1a1f1e', 0.05, alpha=0.25),
    'road': mat('road', '#a8a8a8', 0.9),
}

# ---------- mesh helpers ----------
static = []     # joined into the baked Cabin mesh
glass = []      # the side glass: exported as its own mesh, kept out of the bake
def finish(o, material, bevel=0.0, sub=0, solid=0.0, keep=True, smooth=True):
    sc.collection.objects.link(o); o.data.materials.append(M[material])
    if solid: md = o.modifiers.new('so', 'SOLIDIFY'); md.thickness = solid; md.offset = 0
    if bevel: md = o.modifiers.new('bv', 'BEVEL'); md.width = bevel; md.segments = 3; md.limit_method = 'ANGLE'; md.harden_normals = True
    if sub: md = o.modifiers.new('ss', 'SUBSURF'); md.levels = md.render_levels = sub
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
        if not sub:     # keep creases between faces meeting at over 40 degrees
            bm = bmesh.new(); bm.from_mesh(o.data)
            for e in bm.edges: e.smooth = not (e.is_manifold and e.calc_face_angle(0) > math.radians(40))
            bm.to_mesh(o.data); bm.free()
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
def cylinder(name, r, depth, loc, material, verts=24):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=depth)
    o = finish(mesh_from(name, bm), material, 0.003); o.location = loc; return o
def grid(name, rows, material, sub=0, solid=0.0, keep=True):
    """a quad sheet through rows of points, every row the same length"""
    bm = bmesh.new(); V = [[bm.verts.new(p) for p in r] for r in rows]
    for r0, r1 in zip(V, V[1:]):
        for k in range(len(r0) - 1): bm.faces.new((r0[k], r0[k + 1], r1[k + 1], r1[k]))
    return finish(mesh_from(name, bm), material, 0, sub, solid, keep)
def spline(pts, n=6):
    """Catmull-Rom through pts, n samples per span"""
    P = [Vector(p) for p in pts]; out = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)]
        for k in range(n):
            t = k / n
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(P[-1]); return out
def rrect(w, h, r, k=3):
    """a rounded rectangle centred on the origin, as (a, b) points"""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(k + 1):
            a = math.radians(a0 + 90 * i / k); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts
def sweep(name, path, profile, normal_of, material, sub=0, caps=True):
    """closed 2-D profile (a, b) swept along path: b runs along normal_of(point, tangent) made square to the
    tangent, a along tangent x normal. A path point may carry a 4th value, a scale applied to the profile."""
    bm = bmesh.new(); rings = []
    pts = [Vector(p[:3]) for p in path]; scale = [p[3] if len(p) > 3 else 1.0 for p in path]
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        nv = normal_of(p, t); nv = (nv - t * nv.dot(t)).normalized(); s = t.cross(nv)
        rings.append([bm.verts.new(p + (s * a + nv * b) * scale[i]) for a, b in profile])
    m = len(profile)
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(m): bm.faces.new((r0[k], r0[(k + 1) % m], r1[(k + 1) % m], r1[k]))
    if caps: bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(mesh_from(name, bm), material, 0, sub)
def loft(name, rings, material, bevel=0.0, sub=0):
    """closed rings of points, every ring the same length, joined in order and capped at both ends"""
    bm = bmesh.new(); V = [[bm.verts.new(p) for p in r] for r in rings]; m = len(rings[0])
    for r0, r1 in zip(V, V[1:]):
        for k in range(m): bm.faces.new((r0[k], r0[(k + 1) % m], r1[(k + 1) % m], r1[k]))
    bm.faces.new(V[0][::-1]); bm.faces.new(V[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(mesh_from(name, bm), material, bevel, sub)
def ribbon(name, inner, outer, material, thick=0.016, k=12, face=None):
    """a band between two edge curves (points paired in order), its cross-section a rounded slab bulging toward
    face (a point): one surface with no crease along its length"""
    bm = bmesh.new(); rings = []; n = len(inner); F = Vector(face or EYE)
    A = [Vector(p) for p in inner]; B = [Vector(p) for p in outer]; mid = [(a + b) / 2 for a, b in zip(A, B)]
    for i in range(n):
        t = (mid[min(i + 1, n - 1)] - mid[max(i - 1, 0)]).normalized(); half = (B[i] - A[i]) / 2
        nv = half.cross(t).normalized()
        if nv.dot(F - mid[i]) < 0: nv = -nv
        ring = []
        for j in range(2 * k):
            q = 2 * math.pi * j / (2 * k); c, d = math.cos(q), math.sin(q)
            ring.append(bm.verts.new(mid[i] + half * math.copysign(abs(c) ** 0.7, c) + nv * thick * math.copysign(abs(d) ** 0.7, d)))
        rings.append(ring)
    m = 2 * k
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(m): bm.faces.new((r0[j], r0[(j + 1) % m], r1[(j + 1) % m], r1[j]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(mesh_from(name, bm), material, 0, 0)
def interp(table, x):
    """piecewise-linear lookup in [(x, y), ...] sorted by x"""
    if x <= table[0][0]: return table[0][1]
    for (x0, y0), (x1, y1) in zip(table, table[1:]):
        if x <= x1: return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return table[-1][1]
def mirror(pts): return [(-p[0], *p[1:]) for p in reversed(pts)] + [tuple(p) for p in pts[1:]]

# ---------- dimensions (metres; z is height above the road) ----------
FLOOR = 0.2
BELT = 0.955                         # top of the door cards, the bottom of the side glass
DASH_Y, DASH_Z, DASH_LOW = 0.975, 0.92, 0.745   # dash lip (y), top (z) and underside (z)
WS_Y, WS_Z = 1.80, 0.935             # windscreen base, far forward
HDR_Y = 0.80                         # windscreen top, the front edge of the headliner
DOOR_X = 0.77                        # inner face of the door cards' upper band, beside the seats
def inset(y):
    """how far the sides draw in toward the front"""
    t = min(1.0, max(0.0, (y - 0.35) / 0.65)); return 0.16 * t * t * (3 - 2 * t)
EYE = (0.0, -0.2, 1.15)              # what the windscreen's rim turns its face toward

# The A-pillar's centre line from the dash corner up to the roof, and the roof rail's above the side glass, front to
# back: together the top line of the side glass.
PILLAR = [(0.665, 1.72, 0.945), (0.685, 1.38, 1.085), (0.70, 1.04, 1.225), (0.695, 0.87, 1.30)]
RAIL = [(0.695, 0.86, 1.31), (0.70, 0.45, 1.345), (0.70, 0.0, 1.345), (0.71, -0.4, 1.31), (0.73, -0.78, 1.19)]
A_LINE = sorted((p[1], p[2]) for p in PILLAR)             # the A-pillar's height along y
RAIL_Z = sorted((p[1], p[2]) for p in RAIL)
A_X = sorted((p[1], p[0]) for p in PILLAR); RAIL_X = sorted((p[1], p[0]) for p in RAIL)

# ---------- greenhouse: the A-pillars sweeping into the header rim, roof rails, headliner, side glass ----------
def pillar_edges(y, half):
    """the windscreen-side and glass-side edges of the A-pillar's band at y, the band facing the passengers"""
    c = Vector((interp(A_X, y), y, interp(A_LINE, y))); t = (Vector(PILLAR[0]) - Vector(PILLAR[-1])).normalized()
    nv = Vector(EYE) - c; nv = (nv - t * nv.dot(t)).normalized(); d = t.cross(nv)
    if d.x > 0: d = -d
    return tuple(c + d * half), tuple(c - d * half)
# The windscreen's rim, right half, as its two edges: the opening's edge (inner) and the edge against the headliner
# and the side glass (outer). Across the header, round the corner where the band fans out, down the A-pillar.
RIM_IN = [(0.0, 0.806, 1.325), (0.22, 0.806, 1.325), (0.42, 0.812, 1.325), (0.52, 0.835, 1.326), (0.575, 0.88, 1.326), (0.618, 0.94, 1.32)]
RIM_OUT = [(0.0, 0.79, 1.368), (0.22, 0.79, 1.368), (0.47, 0.785, 1.368), (0.62, 0.772, 1.362), (0.70, 0.765, 1.34), (0.74, 0.80, 1.285)]
for y, half in ((1.02, 0.082), (1.22, 0.078), (1.47, 0.07), (1.72, 0.06)):
    e = pillar_edges(y, half); RIM_IN.append(e[0]); RIM_OUT.append(e[1])
ribbon('frame', spline(mirror(RIM_IN), 8), spline(mirror(RIM_OUT), 8), 'lightGrey')
# The roof rail's band above the side glass: its lower edge carries on from the pillar's glass-side edge, its upper
# edge lies above the headliner. It starts inside the pillar's top.
RAIL_LOW = [(0.72, 0.89, 1.255), (0.742, 0.83, 1.262), (0.735, 0.65, 1.292), (0.72, 0.45, 1.308), (0.72, 0.0, 1.308), (0.73, -0.4, 1.272), (0.75, -0.78, 1.152)]
RAIL_UP = [(0.69, 0.89, 1.295), (0.70, 0.80, 1.335), (0.695, 0.65, 1.37), (0.684, 0.45, 1.388), (0.684, 0.0, 1.388), (0.694, -0.4, 1.352), (0.714, -0.78, 1.232)]
for s in (-1, 1):
    ribbon(f'rail{s}', spline([(s * p[0], p[1], p[2]) for p in RAIL_UP], 6), spline([(s * p[0], p[1], p[2]) for p in RAIL_LOW], 6), 'lightGrey',
           thick=0.013, face=(0, 0.2, 1.0))
    # B-pillar: a light grey band from the belt to the rail at the back of the side glass
    sweep(f'bpillar{s}', spline([(s * 0.785, -0.76, BELT - 0.02), (s * 0.745, -0.74, 1.08), (s * 0.72, -0.76, 1.19)], 4),
          rrect(0.12, 0.035, 0.014), lambda p, t: Vector((-p.x, 0.3, 0)), 'lightGrey')
def roof_top(y): return interp([(-0.84, 1.335), (-0.45, 1.372), (HDR_Y, 1.372)], y)
rows = []
for j in range(19):
    y = HDR_Y + 0.035 - (HDR_Y + 0.035 + 0.86) * j / 18; edge_z = interp(RAIL_Z, y) + 0.022; edge_x = interp(RAIL_X, y) + 0.02
    rows.append([(edge_x * u, y, roof_top(y) - (roof_top(y) - edge_z) * abs(u) ** 3) for u in [i / 8 - 1 for i in range(17)]])
grid('headliner', rows, 'headliner', 1, 0.02)
def glass_top(y):
    """height and inset of the side glass's top line at y: the A-pillar in front, the roof rail behind"""
    if y > 0.86: return interp(A_LINE, y), interp(A_X, y)
    return interp(RAIL_Z, y), interp(RAIL_X, y)
for s in (-1, 1):
    rows = []
    for j in range(28):
        y = 1.70 - (1.70 + 0.76) * j / 27; zt, xt = glass_top(y); zt = max(zt, BELT + 0.001); zb = BELT - 0.02
        xb = 0.805 - 0.4 * inset(y); xt = xt + 0.03
        rows.append([(s * (xb + (xt - xb) * k / 4 + 0.012 * math.sin(math.pi * k / 4)), y, zb + (zt - zb) * k / 4) for k in range(5)])
    glass.append(grid(f'glass{s}', rows, 'glass', 0, 0, keep=False))

# ---------- body: the long sloping hood and the cowl in front of the windscreen ----------
box('cowl', (1.3, 0.07, 0.02), (0, WS_Y + 0.03, WS_Z + 0.005), 'darkGrey', 0.006)
rows = []
for j in range(16):
    t = j / 15; y = WS_Y + 0.07 + 1.08 * t
    base = WS_Z + 0.03 - 0.02 * t - 0.33 * t ** 3.4
    half = 0.86 - 0.18 * (1 - t / 0.35) ** 2 if t < 0.35 else 0.86 - 0.12 * ((t - 0.35) / 0.65) ** 2
    row = []
    for i in range(21):
        x = half * (i / 10 - 1); ax = abs(x) / half * 0.86
        z = base + 0.045 * math.exp(-((ax - 0.66) / 0.12) ** 2) - (0.3 * ((ax - 0.78) / 0.08) ** 2 if ax > 0.78 else 0)
        row.append((x, y, z))
    rows.append(row)
grid('hood', rows, 'body', 1)

# ---------- floor, partition and the footwell tub under the dash ----------
TUB_Y0, TUB_Y1, TUB_X = 0.92, 1.64, 0.65
box('floor', (1.6, WS_Y - 0.1 + 0.86, 0.03), (0, (WS_Y - 0.1 - 0.86) / 2, FLOOR), 'carpet', 0.005)
box('partition', (1.58, 0.06, 1.0), (0, -0.84, FLOOR + 0.5), 'darkGrey', 0.02)
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts:
    v.co = Vector((v.co.x * 2 * TUB_X, TUB_Y0 + (v.co.y + 0.5) * (TUB_Y1 - TUB_Y0), FLOOR + 0.02 + (v.co.z + 0.5) * (DASH_LOW + 0.015 - FLOOR - 0.02)))
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z > 0.5 or f.normal.y < -0.5], context='FACES_ONLY')
bm.edges.ensure_lookup_table()
# round the recess as seen from the seats: the floor's front edge and the two front corners
round_edges = [e for e in bm.edges if not e.is_boundary and all(v.co.y > TUB_Y1 - 0.01 for v in e.verts)]
bmesh.ops.bevel(bm, geom=round_edges, offset=0.13, segments=7, profile=0.5, affect='EDGES', clamp_overlap=True)
# an open shell: every face looks into the recess
inside = Vector((0, (TUB_Y0 + TUB_Y1) / 2, (FLOOR + DASH_LOW) / 2))
for f in bm.faces:
    if f.normal.dot(inside - f.calc_center_median()) < 0: f.normal_flip()
finish(mesh_from('tub', bm), 'carpet', 0, 0)
box('dashUnder', (2 * TUB_X, TUB_Y1 - DASH_Y - 0.06, 0.02), (0, (TUB_Y1 + DASH_Y + 0.06) / 2, DASH_LOW + 0.012), 'darkGrey', 0.004)

# ---------- dashboard: a deep flat deck to the windscreen, and the thin layered slab whose ends roll into the doors ----------
rows = []
for j in range(9):
    y = DASH_Y + 0.05 + (WS_Y - DASH_Y - 0.05) * j / 8; half = DOOR_X - inset(y) - 0.005
    rows.append([(half * (i / 6 - 1), y, DASH_Z - 0.003 + 0.03 * j / 8) for i in range(13)])
grid('dashDeck', rows, 'dash', 0, 0.02)
# the slab's front edge, right half: across, then rounding back along the door and sinking into its upper band
# (x, y, height above the dash top, profile scale)
SLAB = [(0.0, DASH_Y, 0.0, 1), (0.42, DASH_Y, 0.0, 1), (0.53, DASH_Y - 0.005, 0.003, 1), (0.585, 0.94, 0.01, 0.85), (0.612, 0.87, 0.017, 0.55),
        (0.628, 0.82, 0.02, 0.3)]
slab_path = spline(mirror(SLAB), 7)
def outward(p, t):
    """horizontal, away from the passengers: the side of the path the slab body lies on"""
    n = Vector((t.y, -t.x, 0)); return n if n.dot(Vector((p.x, 1.0 - p.y + 0.4, 0))) > 0 else -n
def slab(name, prof, material, lower=None):
    # across the middle the profile's first axis runs down (tangent +x, normal toward the passengers)
    o = sweep(name, [(p[0], p[1], DASH_Z + p[2], p[3]) for p in slab_path], [(-z, -u) for u, z in prof], lambda p, t: -outward(p, t), material)
    if lower:   # (material, profile sides): the faces swept from those sides of the profile take a second material
        o.data.materials.append(M[lower[0]]); m = len(prof)
        for f in o.data.polygons[:(len(slab_path) - 1) * m]:
            if f.index % m in lower[1]: f.material_index = 1
# profile as (u: depth away from the passengers, z: height below the dash top)
LOW = DASH_LOW - DASH_Z
slab('dashSlab', [(0.0, -0.012), (0.004, -0.003), (0.014, 0.0), (0.1, 0.0), (0.1, LOW), (0.05, LOW), (0.042, LOW + 0.005), (0.04, -0.128),
                  (0.016, -0.124), (0.012, -0.118), (0.012, -0.09), (0.016, -0.086), (0.042, -0.086), (0.042, -0.068), (0.006, -0.068), (0.0, -0.062)], 'dashBand', ('darkGrey', range(3, 11)))   # below the vent slot
slab('dashVent', [(0.034, -0.0845), (0.046, -0.0845), (0.046, -0.0695), (0.034, -0.0695)], 'piano')
slab('dashStrip', [(0.029, -0.08), (0.034, -0.08), (0.034, -0.074), (0.029, -0.074)], 'strip')

# ---------- doors: dark upper band, the long swept armrest, dark lower panel, the lever in its recess ----------
for s in (-1, 1):
    prof = [(s * 0.835, FLOOR), (s * 0.79, FLOOR), (s * 0.745, FLOOR + 0.06), (s * 0.74, FLOOR + 0.32), (s * 0.765, FLOOR + 0.38),
            (s * 0.77, BELT - 0.2), (s * DOOR_X, BELT - 0.04), (s * 0.79, BELT), (s * 0.835, BELT)]
    if s < 0: prof = prof[::-1]
    # the belt shelf on top draws in less than the card below it, so it widens toward the front
    loft(f'door{s}', [[(x - s * inset(y) * (0.4 if z >= BELT - 0.001 else 1.0), y, z) for x, z in prof] for y in [-0.78 + (WS_Y - 0.06 + 0.78) * i / 20 for i in range(21)]],
         'darkGrey', 0.012, 1)
    arm = [(s * (x - inset(y)), y, z) for x, y, z in [(0.772, 0.76, BELT - 0.075), (0.768, 0.6, 0.8), (0.763, 0.4, 0.715), (0.758, 0.14, 0.675),
                                                       (0.756, -0.2, 0.665), (0.758, -0.5, 0.667), (0.762, -0.72, 0.672)]]
    # (height, protrusion); the profile's first axis runs down on the right door and up on the left
    ridge = [(-0.045, -0.004), (-0.045, 0.012), (-0.03, 0.03), (0.02, 0.042), (0.034, 0.04), (0.04, 0.03), (0.04, -0.004)]
    sweep(f'armrest{s}', spline(arm, 6), [(-s * a, b) for a, b in ridge], lambda p, t: Vector((-p.x, 0, 0)), 'lightGrey')
    box(f'leverRecess{s}', (0.02, 0.15, 0.065), (s * (0.766 - inset(0.6)), 0.6, 0.66), 'piano', 0.012)
    box(f'lever{s}', (0.025, 0.1, 0.02), (s * (0.756 - inset(0.6)), 0.61, 0.665), 'midGrey', 0.008)

# ---------- headliner front: two sun visors, the overhead console with the dome lights and stop button, the camera pod ----------
for s in (-1, 1): box(f'visor{s}', (0.42, 0.17, 0.03), (s * 0.30, 0.69, 1.345), 'lightGrey', 0.012, 1, Matrix.Rotation(math.radians(18), 4, 'X').to_quaternion())
box('overhead', (0.16, 0.25, 0.04), (0, 0.67, 1.352), 'lightGrey', 0.012, 1)
for s in (-1, 1): box(f'dome{s}', (0.045, 0.06, 0.008), (s * 0.04, 0.6, 1.331), 'dome', 0.004)
box('stop', (0.022, 0.022, 0.008), (0, 0.6, 1.33), 'red', 0.004)
bm = bmesh.new()
top = [bm.verts.new((x, y, 1.335)) for x, y in ((-0.1, 0.66), (0.1, 0.66), (0.1, 0.78), (-0.1, 0.78))]
low = [bm.verts.new((x, y, 1.245)) for x, y in ((-0.075, 0.685), (0.075, 0.685), (0.075, 0.76), (-0.075, 0.76))]
bm.faces.new(top[::-1]); bm.faces.new(low)
for i in range(4): j = (i + 1) % 4; bm.faces.new((top[i], top[j], low[j], low[i]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
finish(mesh_from('cameraPod', bm), 'darkGrey', 0.012)
cylinder('cameraLens', 0.012, 0.006, (0, 0.676, 1.27), 'piano').rotation_euler = (math.radians(90), 0, 0)

# ---------- seats: horizontally segmented cushions, a floating centre armrest, cup holders and window switches ----------
SEAT_Z = 0.5
def seat(x):
    for i, (y, d, h) in enumerate([(0.135, 0.17, 0.13), (-0.04, 0.17, 0.12), (-0.21, 0.165, 0.12)]):
        box(f'cush{x}{i}', (0.6, d, h), (x, y, SEAT_Z - h / 2), 'leather', 0.04, 2)
    tilt = Matrix.Rotation(math.radians(-13), 4, 'X').to_quaternion()
    for i, (z, h) in enumerate([(SEAT_Z + 0.14, 0.24), (SEAT_Z + 0.385, 0.24), (SEAT_Z + 0.6, 0.18)]):
        box(f'back{x}{i}', (0.6, 0.15, h - 0.006), (x, -0.39 - (z - SEAT_Z) * 0.23, z), 'leather', 0.045, 2, tilt)
    box(f'head{x}', (0.29, 0.1, 0.19), (x, -0.59, SEAT_Z + 0.70), 'leather', 0.05, 2, tilt)
    for dx in (-0.08, 0.08): cylinder(f'post{x}{dx}', 0.007, 0.07, (x + dx, -0.57, SEAT_Z + 0.665), 'midGrey', 10)
    box(f'base{x}', (0.5, 0.46, SEAT_Z - FLOOR - 0.12), (x, -0.08, (SEAT_Z - 0.12 + FLOOR) / 2), 'darkGrey', 0.02)
seat(-0.375); seat(0.375)
box('console', (0.15, 0.38, 0.1), (0, 0.0, SEAT_Z - 0.08), 'darkGrey', 0.02, 1)
for y in (0.13, 0.045): cylinder(f'cup{y}', 0.036, 0.012, (0, y, SEAT_Z - 0.025), 'piano')
for y in (-0.06, -0.11): box(f'winSwitch{y}', (0.05, 0.035, 0.012), (0, y, SEAT_Z - 0.026), 'piano', 0.004)
box('armrest', (0.16, 0.42, 0.07), (0, -0.2, SEAT_Z + 0.17), 'leather', 0.03, 2)
box('armPost', (0.05, 0.08, 0.16), (0, -0.38, SEAT_Z + 0.07), 'darkGrey', 0.012)

# ---------- the screen: ~21 in, 4:3, hung in front of the dash and reaching below it; kept out of the bake ----------
SW, SH = 0.43, 0.32; SCY, SCZ = DASH_Y - 0.03, 0.84
box('screenMount', (0.09, 0.03, 0.06), (0, DASH_Y - 0.008, DASH_Z - 0.09), 'darkGrey', 0.01)
box('screenBezel', (SW + 0.014, 0.018, SH + 0.014), (0, SCY + 0.011, SCZ), 'piano', 0.005)
# under the screen: a USB-C port at each end, the two window buttons between them
box('underScreen', (0.12, 0.024, 0.018), (0, SCY + 0.012, SCZ - SH / 2 - 0.016), 'darkGrey', 0.005)
for name, x, w, h in (('usbC0', -0.04, 0.014, 0.006), ('windowButton0', -0.013, 0.016, 0.009), ('windowButton1', 0.013, 0.016, 0.009), ('usbC1', 0.04, 0.014, 0.006)):
    box(name, (w, 0.004, h), (x, SCY - 0.0005, SCZ - SH / 2 - 0.016), 'piano', 0.0015)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, SCY, SCZ), rotation=(math.radians(90), 0, 0))
scr = bpy.context.object; scr.name = 'Screen'; scr.scale = (SW, SH, 1); scr.data.materials.append(M['screen'])
scr.select_set(False)

# ---------- cameras: the page's home seat, the reference's front view, a view from the open left door, a close
# look at the right A-pillar's top corner ----------
def camera(name, loc, target, fov, fit='AUTO'):
    c = bpy.data.objects.new(name, bpy.data.cameras.new(name)); sc.collection.objects.link(c)
    c.data.lens_unit = 'FOV'; c.data.sensor_fit = fit; c.data.angle = math.radians(fov); c.location = loc; c.data.clip_start = 0.02
    c.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return c
# the page's opening view: orbit radius 1.225 m round the screen centre at azimuth -0.326, polar 1.266, 60 deg tall
HOME = camera('home', (-0.374, -0.162, 1.207), (0, SCY, SCZ), 60, 'VERTICAL')
FRONT = camera('front', (0.0, -1.3, 1.15), (0.0, 1.2, 0.86), 54)
DOOR = camera('door', (-1.15, -0.55, 1.08), (0.25, 0.95, 0.62), 70)
CORNER = camera('corner', (-0.2, -0.25, 1.12), (0.62, 0.95, 1.30), 50)
SHOTS = [(HOME, 1470, 729), (FRONT, 1280, 960), (DOOR, 1280, 720), (CORNER, 1280, 960)]
LEFT_SIDE = ('door-1', 'armrest-1', 'leverRecess-1', 'lever-1', 'glass-1', 'rail-1', 'bpillar-1')
SEAT_BACKS = ('back-', 'back0', 'head-', 'head0', 'post', 'partition')   # left out of the front view

def shoot(prefix):
    for c, w, h in SHOTS:
        # the photos are taken through the open left door: hide that door for the door view
        for o in bpy.data.objects:
            if o.name in LEFT_SIDE: o.hide_render = (c is DOOR)
            if o.name.startswith(SEAT_BACKS): o.hide_render = (c is FRONT)
        sc.camera = c; sc.render.resolution_x, sc.render.resolution_y = w, h
        sc.render.filepath = os.path.join(OUT, f'{prefix}_{c.name}.png')
        t = time.time(); bpy.ops.render.render(write_still=True); print(f'TIME {prefix}_{c.name}_s {time.time() - t:.2f}')
    for o in bpy.data.objects: o.hide_render = False

if MODE == 'wb':
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.show_cavity = True
    sc.display.shading.show_object_outline = False
    sc.view_settings.exposure = 1.6
    sc.world = bpy.data.worlds.new('wb'); sc.world.color = (0.75, 0.78, 0.82)
    M['glass'].diffuse_color = (0.22, 0.23, 0.25, 1)    # the tinted glass over the sky, drawn opaque
    shoot('wb')
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
# day: an even, slightly cool sky all round, a wide soft sun high in front, the road under the car
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.95, 0.97, 1.0, 1); bg.inputs['Strength'].default_value = 1.0
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 1.5; sun.data.angle = math.radians(60); sun.data.color = (1.0, 0.96, 0.9)
sun.rotation_euler = (math.radians(-35), 0, math.radians(20))
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60)
road = finish(mesh_from('road', bm), 'road', keep=False, smooth=False)

sc.cycles.samples = 64; sc.cycles.use_denoising = True
shoot('day')

# the side glass stays out of the bake
for o in glass: o.hide_render = True

# join the static cabin, lightmap UVs
bpy.ops.object.select_all(action='DESELECT')
for o in static: o.select_set(True)
bpy.context.view_layer.objects.active = static[0]
bpy.ops.object.convert(target='MESH'); bpy.ops.object.join(); cabin = bpy.context.object; cabin.name = 'Cabin'
while cabin.data.uv_layers: cabin.data.uv_layers.remove(cabin.data.uv_layers[0])
first = cabin.data.uv_layers.new(name='UVMap')     # TEXCOORD_0, unused and all zero; the lightmap is TEXCOORD_1
first.data.foreach_set('uv', [0.0] * (2 * len(first.data)))
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
# night: a dim blue sky, no sun, the dash strip and dome lights on, a warm street lamp passing on the right
bg.inputs['Color'].default_value = (0.25, 0.35, 0.6, 1); bg.inputs['Strength'].default_value = 0.05; sun.hide_render = True
M['strip'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 6
M['dome'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 1.5
lamp = bpy.data.objects.new('street', bpy.data.lights.new('street', 'AREA')); sc.collection.objects.link(lamp)
lamp.data.energy = 120; lamp.data.size = 1.0; lamp.data.color = (1.0, 0.75, 0.45); lamp.location = (3.0, 0.6, 4.0)
lamp.rotation_euler = (Vector((0, 0.3, 0.8)) - lamp.location).to_track_quat('-Z', 'Y').to_euler()
bake('night')
for k in ('strip', 'dome'): M[k].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0

bpy.ops.object.select_all(action='DESELECT')
for o in glass: o.hide_render = False; o.select_set(True)
bpy.context.view_layer.objects.active = glass[0]
bpy.ops.object.join(); side_glass = bpy.context.object; side_glass.name = 'Glass'
bpy.ops.object.select_all(action='DESELECT')
for o in (cabin, scr, side_glass): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'cabin.glb'), use_selection=True, export_format='GLB', export_yup=True, export_texcoords=True, export_apply=True)
print('DONE', len(cabin.data.polygons), 'faces')
