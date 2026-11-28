# Blender axes: x right, y forward, z up. glTF export maps (x, y, z) -> three.js (x, z, -y).
import bpy, bmesh, math, mathutils, time, os, sys
from mathutils import Vector, Matrix

OUT = os.environ.get('CABIN_OUT') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MODE = args[0] if args else 'wb'
SIZE = int(args[1]) if len(args) > 1 else 2048
SAMPLES = int(args[2]) if len(args) > 2 else 256
if MODE not in ('wb', 'uv', 'bake'): sys.exit(f'unknown mode {MODE!r}: use wb, uv or bake')

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
    'lightGrey': mat('lightGrey', '#7a7a7a', 0.65), 'headliner': mat('headliner', '#bcbcbc', 0.95),
    'dash': mat('dash', '#484848', 0.6), 'dashBand': mat('dashBand', '#787878', 0.6), 'darkGrey': mat('darkGrey', '#4a4a4a', 0.55), 'midGrey': mat('midGrey', '#6c6c6c', 0.45),
    'leather': mat('leather', '#434343', 0.42), 'carpet': mat('carpet', '#565656', 1.0),
    'piano': mat('piano', '#111111', 0.15, 0.3), 'strip': mat('strip', '#d9d2c6', 0.4, emit='#ffffff'),
    'dome': mat('dome', '#e8e6e1', 0.5, emit='#fff1dc'), 'ambient': mat('ambient', '#d0d4dc', 0.4, emit='#ffffff'), 'red': mat('red', '#7d1d1d', 0.4),
    'screen': mat('screen', '#08080a', 0.2),
    'body': mat('body', '#6f5c3c', 0.35, 0.3), 'glass': mat('glass', '#1a1f1e', 0.05, alpha=0.25),
    'road': mat('road', '#a8a8a8', 0.9),
}

static = []
glass = []
def finish(o, material, bevel=0.0, sub=0, solid=0.0, keep=True, smooth=True):
    sc.collection.objects.link(o); o.data.materials.append(M[material])
    if solid: md = o.modifiers.new('so', 'SOLIDIFY'); md.thickness = solid; md.offset = 0
    if bevel: md = o.modifiers.new('bv', 'BEVEL'); md.width = bevel; md.segments = 3; md.limit_method = 'ANGLE'; md.harden_normals = True
    if sub: md = o.modifiers.new('ss', 'SUBSURF'); md.levels = md.render_levels = sub
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
        if not sub:
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
    bm = bmesh.new(); V = [[bm.verts.new(p) for p in r] for r in rows]
    for r0, r1 in zip(V, V[1:]):
        for k in range(len(r0) - 1): bm.faces.new((r0[k], r0[k + 1], r1[k + 1], r1[k]))
    return finish(mesh_from(name, bm), material, 0, sub, solid, keep)
def spline(pts, n=6):
    P = [Vector(p) for p in pts]; out = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)]
        for k in range(n):
            t = k / n
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(P[-1]); return out
def rrect(w, h, r, k=3):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(k + 1):
            a = math.radians(a0 + 90 * i / k); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts
def sweep(name, path, profile, normal_of, material, sub=0, caps=True):
    bm = bmesh.new(); rings = []
    pts = [Vector(p[:3]) for p in path]
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        nv = normal_of(p, t); nv = (nv - t * nv.dot(t)).normalized(); s = t.cross(nv)
        rings.append([bm.verts.new(p + s * a + nv * b) for a, b in profile])
    m = len(profile)
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(m): bm.faces.new((r0[k], r0[(k + 1) % m], r1[(k + 1) % m], r1[k]))
    if caps: bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(mesh_from(name, bm), material, 0, sub)
def loft(name, rings, material, bevel=0.0, sub=0):
    bm = bmesh.new(); V = [[bm.verts.new(p) for p in r] for r in rings]; m = len(rings[0])
    for r0, r1 in zip(V, V[1:]):
        for k in range(m): bm.faces.new((r0[k], r0[(k + 1) % m], r1[(k + 1) % m], r1[k]))
    bm.faces.new(V[0][::-1]); bm.faces.new(V[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(mesh_from(name, bm), material, bevel, sub)
def ribbon(name, inner, outer, material, thick=0.016, k=12, face=None):
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
    if x <= table[0][0]: return table[0][1]
    for (x0, y0), (x1, y1) in zip(table, table[1:]):
        if x <= x1: return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return table[-1][1]
def smooth01(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def smooth_interp(table, x):
    if x <= table[0][0]: return table[0][1]
    if x >= table[-1][0]: return table[-1][1]
    X = [p[0] for p in table]; Y = [p[1] for p in table]; n = len(X)
    d = [(Y[i + 1] - Y[i]) / (X[i + 1] - X[i]) for i in range(n - 1)]
    m = [d[0]] + [0.0 if d[i - 1] * d[i] <= 0 else 2 / (1 / d[i - 1] + 1 / d[i]) for i in range(1, n - 1)] + [d[-1]]
    i = max(k for k in range(n - 1) if X[k] <= x); h = X[i + 1] - X[i]; t = (x - X[i]) / h
    return ((2 * t ** 3 - 3 * t * t + 1) * Y[i] + (t ** 3 - 2 * t * t + t) * h * m[i] + (-2 * t ** 3 + 3 * t * t) * Y[i + 1]
            + (t ** 3 - t * t) * h * m[i + 1])
def mirror(pts): return [(-p[0], *p[1:]) for p in reversed(pts)] + [tuple(p) for p in pts[1:]]

FLOOR = 0.2
DASH_Y, DASH_Z, DASH_LOW = 0.975, 0.92, 0.745
WS_Y, WS_Z = 1.50, 0.935
GLASS_Y = 1.37
BP_Y = -0.04
BACK = -0.39
DOOR_Y0, DOOR_Y1 = BACK + 0.06, WS_Y - 0.06
def belt(y):
    return 0.94 + 0.12 * (GLASS_Y - y) / 1.46
HDR_Y = 0.80
DOOR_X, SILL_X = 0.77, 0.79
def inset(y):
    t = min(1.0, max(0.0, (y - 0.35) / 0.65)); return 0.16 * t * t * (3 - 2 * t)
EYE = (0.0, 0.25, 1.15)

PILLAR = [(0.665, 1.44, 0.945), (0.685, 1.22, 1.085), (0.70, 0.99, 1.225), (0.695, 0.87, 1.30)]
RAIL = [(0.695, 0.86, 1.31), (0.70, 0.45, 1.345), (0.70, 0.05, 1.335), (0.71, -0.17, 1.31), (0.72, BACK + 0.06, 1.275)]
A_LINE = sorted((p[1], p[2]) for p in PILLAR)
RAIL_Z = sorted((p[1], p[2]) for p in RAIL)
A_X = sorted((p[1], p[0]) for p in PILLAR); RAIL_X = sorted((p[1], p[0]) for p in RAIL)

def pillar_edges(y, half):
    c = Vector((interp(A_X, y), y, interp(A_LINE, y))); t = (Vector(PILLAR[0]) - Vector(PILLAR[-1])).normalized()
    nv = Vector(EYE) - c; nv = (nv - t * nv.dot(t)).normalized(); d = t.cross(nv)
    if d.x > 0: d = -d
    return tuple(c + d * half), tuple(c - d * half)
RIM_IN = [(0.0, 0.806, 1.325), (0.22, 0.806, 1.325), (0.42, 0.812, 1.325), (0.52, 0.835, 1.326), (0.575, 0.88, 1.326), (0.618, 0.94, 1.32)]
RIM_OUT = [(0.0, 0.79, 1.368), (0.22, 0.79, 1.368), (0.47, 0.785, 1.368), (0.62, 0.772, 1.362), (0.70, 0.765, 1.34), (0.74, 0.80, 1.285)]
for y, half in ((0.97, 0.082), (1.10, 0.078), (1.27, 0.07)):
    e = pillar_edges(y, half); RIM_IN.append(e[0]); RIM_OUT.append(e[1])
BASE_IN = [(0.640, 1.37, 1.05), (0.628, 1.435, 0.995), (0.605, 1.475, 0.963), (0.565, 1.49, 0.944), (0.52, 1.495, 0.905)]
BASE_OUT = [(0.724, 1.30, 0.98), (0.735, 1.345, 0.955), (0.745, 1.368, 0.93), (0.750, 1.371, 0.91), (0.752, 1.373, 0.89)]
RIM_IN += BASE_IN; RIM_OUT += BASE_OUT
ribbon('frame', spline(mirror(RIM_IN), 8), spline(mirror(RIM_OUT), 8), 'lightGrey')
RAIL_LOW = [(0.72, 0.89, 1.255), (0.742, 0.83, 1.262), (0.735, 0.65, 1.292), (0.72, 0.45, 1.308), (0.72, 0.05, 1.298), (0.73, -0.17, 1.272), (0.74, BACK + 0.06, 1.237)]
RAIL_UP = [(0.69, 0.89, 1.295), (0.70, 0.80, 1.335), (0.695, 0.65, 1.37), (0.684, 0.45, 1.388), (0.684, 0.05, 1.378), (0.694, -0.17, 1.352), (0.704, BACK + 0.06, 1.317)]
for s in (-1, 1):
    ribbon(f'rail{s}', spline([(s * p[0], p[1], p[2]) for p in RAIL_UP], 6), spline([(s * p[0], p[1], p[2]) for p in RAIL_LOW], 6), 'lightGrey',
           thick=0.013, face=(0, 0.2, 1.0))
    sweep(f'bpillar{s}', spline([(s * 0.785, BP_Y, belt(BP_Y) - 0.02), (s * 0.755, BP_Y - 0.05, 1.18), (s * 0.722, BP_Y - 0.11, 1.305)], 4),
          rrect(0.12, 0.035, 0.014), lambda p, t: Vector((-p.x, 0.3, 0)), 'lightGrey')
def roof_top(y): return interp([(BACK - 0.03, 1.345), (-0.1, 1.372), (HDR_Y, 1.372)], y)
rows = []
for j in range(19):
    y = HDR_Y + 0.035 - (HDR_Y + 0.035 - BACK + 0.02) * j / 18; edge_z = interp(RAIL_Z, y) + 0.022; edge_x = interp(RAIL_X, y) + 0.02
    rows.append([(edge_x * u, y, roof_top(y) - (roof_top(y) - edge_z) * abs(u) ** 3) for u in [i / 8 - 1 for i in range(17)]])
grid('headliner', rows, 'headliner', 1, 0.02)
def glass_top(y):
    if y > 0.86: return interp(A_LINE, y), interp(A_X, y)
    return interp(RAIL_Z, y), interp(RAIL_X, y)
for s in (-1, 1):
    rows = []
    for j in range(28):
        y = GLASS_Y - (GLASS_Y - BACK - 0.08) * j / 27; zt, xt = glass_top(y); zt = max(zt, belt(y) + 0.001); zb = belt(y) - 0.02
        xb = 0.805 - 0.4 * inset(y); xt = xt + 0.03
        rows.append([(s * (xb + (xt - xb) * k / 4 + 0.012 * math.sin(math.pi * k / 4)), y, zb + (zt - zb) * k / 4) for k in range(5)])
    glass.append(grid(f'glass{s}', rows, 'glass', 0, 0, keep=False))

box('cowl', (1.3, 0.07, 0.02), (0, WS_Y + 0.03, WS_Z + 0.005), 'darkGrey', 0.006)
HOOD_Y, NOSE_Y = WS_Y + 0.07, WS_Y + 1.15
FENDER_Y = GLASS_Y + 0.01
SILHOUETTE = [(HOOD_Y, 0.912), (HOOD_Y + 0.35, 0.894), (HOOD_Y + 0.62, 0.823), (HOOD_Y + 0.80, 0.741), (HOOD_Y + 0.97, 0.629), (NOSE_Y, 0.57)]
def hood_z(y):
    y = max(y, HOOD_Y); return smooth_interp(SILHOUETTE, y) - 0.045 * smooth01((y - HOOD_Y) / 0.35)
def body_half(y):
    return interp([(FENDER_Y, 0.83), (1.6, 0.855), (1.9, 0.875), (2.2, 0.865), (2.45, 0.82), (2.6, 0.74), (NOSE_Y, 0.68)], y)
def shoulder_z(y):
    return smooth_interp([(FENDER_Y, belt(FENDER_Y) - 0.015)] + SILHOUETTE, y)
def body_section(y, n_top=14, n_roll=8):
    rx, rz = interp([(FENDER_Y, 0.09), (2.0, 0.12), (NOSE_Y, 0.16)], y), interp([(FENDER_Y, 0.12), (2.0, 0.17), (NOSE_Y, 0.2)], y)
    H = body_half(y); xs = H - rx; zc = hood_z(y); zs = shoulder_z(y); w = 0.12 / xs
    pts = []
    for i in range(n_top + 1):
        u = 1 - (1 - i / n_top) ** 1.5; pts.append((u * xs, zc + (zs - zc) * math.exp(-((u - 1) / w) ** 2)))
    for i in range(1, n_roll + 1):
        a = math.radians(90 * i / n_roll); pts.append((xs + rx * math.sin(a), zs - rz * (1 - math.cos(a))))
    low = min(0.68, zs - rz - 0.04)
    for k in (1, 2):
        pts.append((H - 0.012 * k / 2, zs - rz - (zs - rz - low) * k / 2))
    return pts
def body_rear(x):
    return interp([(0.6, HOOD_Y), (0.665, WS_Y), (0.74, FENDER_Y + 0.03), (0.78, FENDER_Y)], x)
n_cols = len(body_section(HOOD_Y)); rows = []
x_rear = [p[0] for p in body_section(HOOD_Y)]
for j in range(25):
    t = j / 24; row = []
    for c in range(n_cols):
        y0 = body_rear(x_rear[c]); y = y0 + (NOSE_Y - y0) * t
        x, z = body_section(y)[c]; row.append((x, y, z))
    rows.append(mirror(row))
grid('body', rows, 'body', 1)

TUB_Y0, TUB_Y1, TUB_X = 0.92, 1.30, 0.65
box('floor', (1.6, WS_Y - 0.1 - BACK + 0.02, 0.03), (0, (WS_Y - 0.1 + BACK - 0.02) / 2, FLOOR), 'carpet', 0.005)
box('partition', (1.58, 0.06, 1.0), (0, BACK, FLOOR + 0.5), 'darkGrey', 0.02)
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts:
    v.co = Vector((v.co.x * 2 * TUB_X, TUB_Y0 + (v.co.y + 0.5) * (TUB_Y1 - TUB_Y0), FLOOR + 0.02 + (v.co.z + 0.5) * (DASH_LOW + 0.015 - FLOOR - 0.02)))
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z > 0.5 or f.normal.y < -0.5], context='FACES_ONLY')
bm.edges.ensure_lookup_table()
round_edges = [e for e in bm.edges if not e.is_boundary and all(v.co.y > TUB_Y1 - 0.01 for v in e.verts)]
bmesh.ops.bevel(bm, geom=round_edges, offset=0.13, segments=7, profile=0.5, affect='EDGES', clamp_overlap=True)
inside = Vector((0, (TUB_Y0 + TUB_Y1) / 2, (FLOOR + DASH_LOW) / 2))
for f in bm.faces:
    if f.normal.dot(inside - f.calc_center_median()) < 0: f.normal_flip()
finish(mesh_from('tub', bm), 'carpet', 0, 0)
box('dashUnder', (2 * TUB_X, TUB_Y1 - DASH_Y - 0.06, 0.02), (0, (TUB_Y1 + DASH_Y + 0.06) / 2, DASH_LOW + 0.012), 'darkGrey', 0.004)

DECK_X, DECK_ON_SILL = 0.72, 0.01
DECK_RISE, DECK_RUN, DECK_THICK = 0.03, WS_Y - DASH_Y - 0.05, 0.02
def deck_z(y): return DASH_Z - 0.003 + DECK_RISE * (y - DASH_Y - 0.05) / DECK_RUN
rows = []
for y in [DASH_Y + 0.05 + DECK_RUN * j / 8 for j in range(8)] + [DOOR_Y1 + 0.006, WS_Y]:
    half = DECK_X if y > DOOR_Y1 + 0.003 else SILL_X - inset(y) + DECK_ON_SILL
    rows.append([(half * (i / 6 - 1), y, deck_z(y)) for i in range(13)])
grid('dashDeck', rows, 'dash', 0, DECK_THICK)
SLAB_X, SLAB_R = 0.606, 0.025
SLOT_X, SLOT_L = SLAB_X - 0.04, 0.012
LOW = DASH_LOW - DASH_Z
SLAB_PROF = [(0.0, -0.012), (0.004, -0.003), (0.014, 0.0), (0.1, 0.0), (0.1, LOW), (0.05, LOW), (0.042, LOW + 0.005), (0.04, -0.128),
             (0.016, -0.124), (0.012, -0.118), (0.012, -0.09), (0.016, -0.086), (0.042, -0.086), (0.042, -0.068), (0.006, -0.068), (0.0, -0.062)]
NP = len(SLAB_PROF)
SLAB_LOWER = range(3, 11)
SLOT = (11, 12, 13, 14)
ABOVE, BELOW = 15, 10
def slab_prof(closed):
    out = list(SLAB_PROF); (ua, za), (ub, zb) = SLAB_PROF[ABOVE], SLAB_PROF[BELOW]
    mid = (SLAB_PROF[SLOT[0]][1] + SLAB_PROF[SLOT[-1]][1]) / 2
    for n, i in enumerate(SLOT):
        z = mid + 0.001 * (n - 1.5); f = (ua + (ub - ua) * (z - za) / (zb - za), z)
        out[i] = tuple(a + (b - a) * closed for a, b in zip(SLAB_PROF[i], f))
    return out
def dense(prof, step=0.004):
    out = []
    for k, p in enumerate(prof):
        q = prof[(k + 1) % len(prof)]; n = max(1, math.ceil(math.dist(p, q) / step))
        out += [((p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n), k) for i in range(n)]
    return out
def seg_dist(p, a, b):
    ab = (b[0] - a[0], b[1] - a[1]); t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2)
    t = max(0.0, min(1.0, t)); return math.dist(p, (a[0] + ab[0] * t, a[1] + ab[1] * t))
def inside_poly(p, poly):
    c = False
    for a, b in zip(poly, poly[1:] + poly[:1]):
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < a[0] + (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]): c = not c
    return c
def build_slab():
    bm = bmesh.new(); dropped = 0
    full = dense(slab_prof(1.0)); m = len(full)
    stations = [(0.0, 0.0)]
    for i in range(9):
        a = math.radians(90 * i / 8); stations.append((SLOT_X - SLOT_L * (1 - math.sin(a)), 1 - math.cos(a)))
    stations.append((SLAB_X - SLAB_R, 1.0))
    stations = [(-x, c) for x, c in reversed(stations[1:])] + stations
    rings = []
    for x, c in stations:
        prof = slab_prof(c); pts = []
        for (u, z), k in full:
            if k in (BELOW, *SLOT):
                fa, fb = slab_prof(1.0)[k], slab_prof(1.0)[(k + 1) % NP]
                L = math.dist(fa, fb); t = math.dist(fa, (u, z)) / L if L else 0.0
                pa, pb = prof[k], prof[(k + 1) % NP]; u, z = pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t
            pts.append(bm.verts.new((x, DASH_Y + u, DASH_Z + z)))
        rings.append(pts)
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(m):
            f = bm.faces.new((r0[j], r0[(j + 1) % m], r1[(j + 1) % m], r1[j])); f.material_index = int(full[j][1] in SLAB_LOWER)
    poly = [p for p, _ in full]; sides = slab_prof(1.0)
    if sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1])) < 0: order = list(range(m))[::-1]
    else: order = list(range(m))
    edges = list(zip(poly, poly[1:] + poly[:1]))
    def dist(p): return min(seg_dist(p, a, b) for a, b in edges)
    inner = []
    def add(p, d):
        if inside_poly(p, poly) and all(math.dist(p, q) > 0.0012 for q, _ in inner): inner.append((p, d))
    for th in range(1, 7):
        want = SLAB_R * (1 - math.cos(math.radians(15 * th)))
        for j, (a, _) in enumerate(full):
            b = full[(j + 1) % m][0]; c = full[j - 1][0]
            t = (b[0] - c[0], b[1] - c[1]); n = math.hypot(*t); nv = (-t[1] / n, t[0] / n)
            if not inside_poly((a[0] + nv[0] * 1e-4, a[1] + nv[1] * 1e-4), poly): nv = (-nv[0], -nv[1])
            q = (a[0] + nv[0] * want, a[1] + nv[1] * want)
            if abs(dist(q) - want) < 0.0005: add(q, want)
    g = 0.004
    for i in range(int(0.1 / g) + 2):
        for j in range(int(-LOW / g) + 2):
            q = (i * g, -j * g); d = dist(q)
            if d > SLAB_R + g / 2: add(q, d)
    vs, _, faces, orig, _, _ = mathutils.geometry.delaunay_2d_cdt([Vector(p) for p in poly] + [Vector(p) for p, _ in inner], [], [order], 1, 1e-6)
    for s, ring in ((1, rings[-1]), (-1, rings[0])):
        x0 = s * (SLAB_X - SLAB_R); made = {}
        def vert(i):
            if i not in made:
                o = [k for k in orig[i] if k < m]
                if o: made[i] = ring[o[0]]
                else:
                    p, d = inner[orig[i][0] - m]; h = SLAB_R * math.sqrt(max(0.0, 1 - (1 - min(d / SLAB_R, 1.0)) ** 2))
                    made[i] = bm.verts.new((x0 + s * h, DASH_Y + p[0], DASH_Z + p[1]))
            return made[i]
        for fc in faces:
            vv = [vert(i) for i in fc]
            if len(set(vv)) < 3: dropped += 1; continue
            cu = sum(vs[i][0] for i in fc) / len(fc); cz = sum(vs[i][1] for i in fc) / len(fc)
            k = min(range(NP), key=lambda k: seg_dist((cu, cz), sides[k], sides[(k + 1) % NP]))
            try: f = bm.faces.new(vv)
            except ValueError: dropped += 1; continue
            f.material_index = int(k in SLAB_LOWER)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = finish(mesh_from('dashSlab', bm), 'dashBand', 0, 0); o.data.materials.append(M['darkGrey'])
    print(f'MEASURE dash end caps: {dropped} faces left out of the triangulation')
    return o
build_slab()
VENT_PATH = [(x, DASH_Y, 0.0) for x in (-(SLOT_X - SLOT_L - 0.002), SLOT_X - SLOT_L - 0.002)]
def outward(p, t):
    n = Vector((t.y, -t.x, 0)); return n if n.dot(Vector((p.x, 1.0 - p.y + 0.4, 0))) > 0 else -n
def slab(name, prof, material, path):
    sweep(name, [(p[0], p[1], DASH_Z + p[2]) for p in path], [(-z, -u) for u, z in prof], lambda p, t: -outward(p, t), material)
slab('dashVent', [(0.034, -0.0845), (0.046, -0.0845), (0.046, -0.0695), (0.034, -0.0695)], 'piano', VENT_PATH)
slab('dashStrip', [(0.029, -0.08), (0.034, -0.08), (0.034, -0.074), (0.029, -0.074)], 'strip', VENT_PATH)

M['frame'] = mat('frame', '#4b4a48', 0.8); M['insert'] = mat('insert', '#7a736a', 0.85); M['block'] = mat('block', '#847e75', 0.6)
M['blockTop'] = mat('blockTop', '#9a9a95', 0.35)
PAN_REAR, PAN_FRONT, PAN_R = -0.10, 0.95, 0.12
BLK_REAR, BLK_FRONT = -0.07, 0.80
PAN_STEP, BLK_RISE = 0.018, 0.035
PAN_DEPTH = 0.022
BLK_TOP_RISE = 0.012
LEAN = 0.3
SHOULDER_Y, SHOULDER_D = 0.945, 0.045
BAR_REAR, BAR_FRONT = 0.07, BLK_FRONT - 0.08
def door_base(y, z):
    b = belt(y)
    return interp([(FLOOR, 0.79), (FLOOR + 0.05, 0.752), (FLOOR + 0.12, 0.746), (b - 0.10, 0.764), (b - 0.035, DOOR_X), (b, SILL_X)], z)
def rbox(y, z, y0, y1, z0, z1, r):
    r = min(r, (z1 - z0) / 2, (y1 - y0) / 2)
    qy = max(y0 + r - y, y - (y1 - r), 0.0); qz = max(z0 + r - z, z - (z1 - r), 0.0)
    inside = min(max(y0 + r - y, y - (y1 - r), z0 + r - z, z - (z1 - r)), 0.0)
    return math.hypot(qy, qz) - r + inside
def pan_edges(y):
    t = min(1.0, max(0.0, (y - PAN_REAR) / (PAN_FRONT - PAN_REAR)))
    return 0.42 + 0.15 * t, 0.80 + (belt(PAN_REAR) - 0.06 - 0.80) * (1 - t ** 1.8)
def blk_edges(y):
    t = min(1.0, max(0.0, (y - BLK_REAR) / (BLK_FRONT - BLK_REAR)))
    return 0.47 + 0.12 * t ** 1.2, 0.80 - 0.09 * t
def pan_sdf(y, z):
    z0, z1 = pan_edges(y); return rbox(y + LEAN * (z - 0.6), z, PAN_REAR, PAN_FRONT, z0, z1, PAN_R)
def blk_sdf(y, z):
    z0, z1 = blk_edges(y); yl = y + LEAN * (z - 0.6)
    d = rbox(yl, z, BLK_REAR, BLK_FRONT + 1.0, z0, z1, 0.03)
    if y > (BLK_FRONT - (z1 - z0) / 2): d = max(d, rbox(y, z, BLK_REAR - 1.0, BLK_FRONT, z0, z1, (z1 - z0) / 2))
    return d
def blk_rise(y, z):
    z0, z1 = blk_edges(y); return BLK_RISE + (BLK_TOP_RISE - BLK_RISE) * smooth01(((z - z0) / (z1 - z0) - 0.35) / 0.3)
def blk_depth(y, z):
    z0, z1 = blk_edges(y); return 0.04 + 0.035 * smooth01((z - z0) / (z1 - z0))
def blk_crest(y, z): return blk_sdf(y, z) + blk_rise(y, z)
def band_sdf(y, z):
    z0, z1 = blk_edges(y); return max(blk_sdf(y, z), -blk_crest(y, z), (z0 + z1) / 2 - z)
def slot_sdf(y, z):
    top = blk_edges(y)[1]; return max(top - z, z - (top + 0.02), BLK_REAR + 0.12 - y, y - (BLK_FRONT - 0.05))
def shoulder(y, z):
    return smooth01((y - SHOULDER_Y + 0.015) / 0.03) * smooth01((z - (DASH_LOW - 0.065)) / 0.05) * smooth01((belt(y) - 0.005 - z) / 0.045)
def slot_edge(y, z): return slot_sdf(y, z) + 0.006
def pan_crest(y, z): return pan_sdf(y, z) + PAN_STEP
def card_x(y, z):
    x = door_base(y, z) - inset(y)
    x += PAN_DEPTH * smooth01(-pan_sdf(y, z) / PAN_STEP)
    t = min(1.0, max(0.0, -blk_sdf(y, z) / blk_rise(y, z)))
    x -= blk_depth(y, z) * (1 - (1 - t) ** 2)
    ds = slot_sdf(y, z)
    if ds < 0: x += 0.012 * smooth01(-ds / 0.006)
    x -= SHOULDER_D * shoulder(y, z)
    return x
def material_at(y, z):
    if band_sdf(y, z) < 0: return 3
    if blk_sdf(y, z) < 0: return 2
    return 0 if pan_sdf(y, z) < 0 else 1
NY, NZ = 320, 320
def blk_mid(y, z): return blk_sdf(y, z) + 0.5 * blk_rise(y, z)
def onto_outline(y, z, cy, cz):
    for f, boundary in ((blk_sdf, True), (pan_sdf, True), (blk_crest, True), (blk_mid, False), (pan_crest, False), (slot_sdf, False), (slot_edge, False)):
        d = f(y, z)
        gy = (f(y + 1e-4, z) - f(y - 1e-4, z)) / 2e-4; gz = (f(y, z + 1e-4) - f(y, z - 1e-4)) / 2e-4; g = gy * gy + gz * gz
        if g < 0.25: continue
        if abs(d) < 0.5 * (abs(gy) * cy + abs(gz) * cz):
            return y - d * gy / g, z - d * gz / g, boundary
    return y, z, False
CARD = []
for i in range(NY + 1):
    y = DOOR_Y0 + (DOOR_Y1 - DOOR_Y0) * i / NY; b = belt(y)
    col = [(y, FLOOR + (b - FLOOR) * k / NZ, False) for k in range(NZ + 1)]
    if 0 < i < NY: col[1:-1] = [onto_outline(*q[:2], (DOOR_Y1 - DOOR_Y0) / NY, (b - FLOOR) / NZ) for q in col[1:-1]]
    CARD.append(col)
for s in (-1, 1):
    bm = bmesh.new(); V = []
    for col in CARD:
        row = [bm.verts.new((s * (0.835 - inset(col[0][0])), *col[0][:2]))]
        row += [bm.verts.new((s * card_x(y, z), y, z)) for y, z, _ in col[1:-1]]
        row += [bm.verts.new((s * (0.835 - 0.4 * inset(col[-1][0])), *col[-1][:2]))]
        V.append(row)
    for i in range(NY):
        for k in range(NZ):
            q = [(i, k), (i, k + 1), (i + 1, k + 1), (i + 1, k)]
            if CARD[i][k + 1][2] and CARD[i + 1][k][2] and not (CARD[i][k][2] and CARD[i + 1][k + 1][2]): q = q[1:] + q[:1]
            for tri in ((q[0], q[1], q[2]), (q[0], q[2], q[3])):
                c = [sum(CARD[a][b][j] for a, b in tri) / 3 for j in (0, 1)]
                f = bm.faces.new([V[a][b] for a, b in (tri if s > 0 else tri[::-1])]); f.material_index = material_at(*c)
    o = finish(mesh_from(f'door{s}', bm), 'insert', 0, 0)
    for n in ('frame', 'block', 'blockTop'): o.data.materials.append(M[n])
    md = o.modifiers.new('dc', 'DECIMATE'); md.decimate_type = 'DISSOLVE'; md.angle_limit = math.radians(0.5); md.delimit = {'MATERIAL'}
    o.modifiers.new('tr', 'TRIANGULATE')
    me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get())); o.modifiers.clear(); o.data = me
    if 'sharp_edge' in me.attributes: me.attributes.remove(me.attributes['sharp_edge'])
    me.validate(); me.update()
    normals = []; h = 1e-4
    for v in me.vertices:
        y, z = v.co.y, v.co.z
        if z <= FLOOR + 1e-5 or z >= belt(y) - 1e-5: normals.append(v.normal.copy()); continue
        a = (card_x(y + h, z) - card_x(y - h, z)) / (2 * h); c = (card_x(y, z + h) - card_x(y, z - h)) / (2 * h)
        normals.append(Vector((-s, a, c)).normalized())
    me.normals_split_custom_set_from_vertices(normals)
    ry = BLK_FRONT - 0.09; rz = blk_edges(ry)[1] + 0.004
    box(f'release{s}', (0.010, 0.034, 0.016), (s * (card_x(ry, rz - 0.025) - 0.004), ry, rz), 'piano', 0.004)
    bar = [(y, blk_edges(y)[1] + 0.008) for y in (BAR_REAR + (BAR_FRONT - BAR_REAR) * i / 40 for i in range(41))]
    sweep(f'doorBar{s}', [(s * (card_x(y, z) - 0.003), y, z) for y, z in bar], [(-0.003, -0.0015), (0.003, -0.0015), (0.003, 0.0015), (-0.003, 0.0015)],
          lambda p, t, s=s: Vector((-s, 0, 0)), 'ambient')

M['grille'] = mat('grille', '#262626', 0.7)
GRILLE_Y, GRILLE_Z = 0.95, 0.47
GRILLE_FACE, GRILLE_N = 0.07, 48
GRILLE_RINGS = [(0.0, 0.003), (0.035, 0.003), (GRILLE_FACE, 0.003), (0.074, 0.006), (0.080, 0.006), (0.085, -0.002)]
for s in (-1, 1):
    bm = bmesh.new(); n = GRILLE_N; rings = []
    for r, lift in GRILLE_RINGS:
        pts = [(GRILLE_Y + r * math.cos(2 * math.pi * k / n), GRILLE_Z + r * math.sin(2 * math.pi * k / n)) for k in range(n if r else 1)]
        rings.append([bm.verts.new((s * (card_x(y, z) - lift), y, z)) for y, z in pts])
    for k in range(n): bm.faces.new((rings[0][0], rings[1][k], rings[1][(k + 1) % n])).material_index = 0
    for i, (r0, r1) in enumerate(zip(rings[1:], rings[2:]), 1):
        for k in range(n): bm.faces.new((r0[k], r1[k], r1[(k + 1) % n], r0[(k + 1) % n])).material_index = int(GRILLE_RINGS[i][0] >= GRILLE_FACE)
    bm.normal_update()
    for f in bm.faces:
        if f.normal.x * s > 0: f.normal_flip()
    o = finish(mesh_from(f'grille{s}', bm), 'grille'); o.data.materials.append(M['darkGrey'])
DECK_GRILLE_Y = (1.37, WS_Y - 0.015)
box('deckGrille', (2 * (DOOR_X - inset(DOOR_Y1) - 0.03), DECK_GRILLE_Y[1] - DECK_GRILLE_Y[0], 0.004),
    (0, sum(DECK_GRILLE_Y) / 2, deck_z(sum(DECK_GRILLE_Y) / 2) + DECK_THICK / 2 + 0.0005), 'grille', 0.0015,
    rot=Matrix.Rotation(math.atan2(DECK_RISE, DECK_RUN), 4, 'X').to_quaternion())
TRIM_Y, TRIM_X, TRIM_H = (DECK_GRILLE_Y[1] - 0.002, WS_Y), 0.64, 0.006
ribbon('windscreenTrim', *[[(TRIM_X * (i / 16 - 1), y, deck_z(y) + DECK_THICK / 2) for i in range(33)] for y in TRIM_Y], 'lightGrey', TRIM_H,
       face=(0, WS_Y, 2.0))

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

SEAT_Z, SEAT_Y = 0.42, 0.45
SEAT_BACK_PARTS = {}
def seat(x):
    for i, (y, d, h) in enumerate([(0.135, 0.17, 0.13), (-0.04, 0.17, 0.12), (-0.21, 0.165, 0.12)]):
        box(f'cush{x}{i}', (0.6, d, h), (x, SEAT_Y + y, SEAT_Z - h / 2), 'leather', 0.04, 2)
    tilt = Matrix.Rotation(math.radians(-13), 4, 'X').to_quaternion(); parts = []
    for i, (z, h) in enumerate([(SEAT_Z + 0.14, 0.24), (SEAT_Z + 0.385, 0.24), (SEAT_Z + 0.6, 0.18)]):
        parts.append(box(f'back{x}{i}', (0.6, 0.15, h - 0.006), (x, SEAT_Y - 0.39 - (z - SEAT_Z) * 0.23, z), 'leather', 0.045, 2, tilt))
    parts.append(box(f'head{x}', (0.29, 0.1, 0.19), (x, SEAT_Y - 0.59, SEAT_Z + 0.70), 'leather', 0.05, 2, tilt))
    for dx in (-0.08, 0.08): parts.append(cylinder(f'post{x}{dx}', 0.007, 0.07, (x + dx, SEAT_Y - 0.57, SEAT_Z + 0.665), 'midGrey', 10))
    SEAT_BACK_PARTS['SeatBackLeft' if x < 0 else 'SeatBackRight'] = parts
    box(f'base{x}', (0.5, 0.46, SEAT_Z - FLOOR - 0.12), (x, SEAT_Y - 0.08, (SEAT_Z - 0.12 + FLOOR) / 2), 'darkGrey', 0.02)
seat(-0.375); seat(0.375)
box('console', (0.15, 0.38, 0.1), (0, SEAT_Y, SEAT_Z - 0.08), 'darkGrey', 0.02, 1)
for y in (0.13, 0.045): cylinder(f'cup{y}', 0.036, 0.012, (0, SEAT_Y + y, SEAT_Z - 0.025), 'piano')
for y in (-0.06, -0.11): box(f'winSwitch{y}', (0.05, 0.035, 0.012), (0, SEAT_Y + y, SEAT_Z - 0.026), 'piano', 0.004)
box('armrest', (0.16, 0.42, 0.07), (0, SEAT_Y - 0.2, SEAT_Z + 0.17), 'leather', 0.03, 2)
box('armPost', (0.05, 0.08, 0.16), (0, SEAT_Y - 0.38, SEAT_Z + 0.07), 'darkGrey', 0.012)

SW, SH = 0.43, 0.32; SCY, SCZ = DASH_Y - 0.03, 0.84
box('screenMount', (0.09, 0.03, 0.06), (0, DASH_Y - 0.008, DASH_Z - 0.09), 'darkGrey', 0.01)
box('screenBezel', (SW + 0.014, 0.018, SH + 0.014), (0, SCY + 0.011, SCZ), 'piano', 0.005)
box('underScreen', (0.12, 0.024, 0.018), (0, SCY + 0.012, SCZ - SH / 2 - 0.016), 'darkGrey', 0.005)
for name, x, w, h in (('usbC0', -0.04, 0.014, 0.006), ('windowButton0', -0.013, 0.016, 0.009), ('windowButton1', 0.013, 0.016, 0.009), ('usbC1', 0.04, 0.014, 0.006)):
    box(name, (w, 0.004, h), (x, SCY - 0.0005, SCZ - SH / 2 - 0.016), 'piano', 0.0015)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, SCY, SCZ), rotation=(math.radians(90), 0, 0))
scr = bpy.context.object; scr.name = 'Screen'; scr.scale = (SW, SH, 1); scr.data.materials.append(M['screen'])
scr.select_set(False)

def camera(name, loc, target, fov, fit='AUTO'):
    c = bpy.data.objects.new(name, bpy.data.cameras.new(name)); sc.collection.objects.link(c)
    c.data.lens_unit = 'FOV'; c.data.sensor_fit = fit; c.data.angle = math.radians(fov); c.location = loc; c.data.clip_start = 0.02
    c.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return c
ORBIT_C = (0, SCY, SCZ + 0.21)
HOME = camera('home', (-0.375, 0.0278, 1.14), ORBIT_C, 60, 'VERTICAL')
FRONT = camera('front', (0.0, -0.3, 1.15), (0.0, 1.2, 0.86), 76)
DOOR = camera('door', (-1.15, -0.1, 1.08), (0.25, 0.95, 0.62), 70)
CORNER = camera('corner', (-0.2, 0.2, 1.12), (0.62, 0.95, 1.30), 50)
RDOOR = camera('rdoor', (-0.38, 0.25, 1.12), (0.78, 0.42, 0.72), 82)
SIDE = camera('side', (-8.0, 0.55, 0.8), (0.0, 0.55, 0.8), 16)
DASHEND = camera('dashend', (-0.3, 0.45, 1.05), (-0.62, 1.05, 0.86), 50)
LEFT = camera('left', (-0.5876, 0.1471, 1.14), ORBIT_C, 60, 'VERTICAL')
RIGHT = camera('right', (0.5876, 0.1471, 1.14), ORBIT_C, 60, 'VERTICAL')
OUTSIDE = camera('outside', (-3.0, 5.4, 1.7), (0.1, 1.5, 0.75), 34)
SHOTS = [(HOME, 1470, 729), (LEFT, 1470, 729), (RIGHT, 1470, 729), (FRONT, 1280, 960), (DOOR, 1280, 720), (CORNER, 1280, 960),
         (RDOOR, 1280, 720), (SIDE, 1600, 800), (DASHEND, 1280, 720), (OUTSIDE, 1280, 960)]
LEFT_SIDE = ('door-1', 'release-1', 'glass-1', 'rail-1', 'bpillar-1', 'grille-1', 'doorBar-1')
SEAT_BACKS_AND_PARTITION = ('back-', 'back0', 'head-', 'head0', 'post', 'partition')
SEATS = ('cush', 'back', 'head', 'post', 'base', 'console', 'armrest', 'armPost', 'cup', 'winSwitch')
PAGE_VIEWS = (HOME, LEFT, RIGHT)
SEAT_BACK_NEAR = 0.12

def hidden_seat_backs(c):
    dg = bpy.context.evaluated_depsgraph_get(); hidden = set()
    for parts in SEAT_BACK_PARTS.values():
        P = [o.matrix_world @ v.co for o in parts for v in o.evaluated_get(dg).data.vertices]
        gap = [max(min(p[i] for p in P) - c.location[i], 0, c.location[i] - max(p[i] for p in P)) for i in range(3)]
        if math.hypot(*gap) < SEAT_BACK_NEAR: hidden |= {o.name for o in parts}
    return hidden

def shoot(prefix):
    for c, w, h in SHOTS:
        near = hidden_seat_backs(c) if c in PAGE_VIEWS else set()
        for o in bpy.data.objects:
            if o.name in LEFT_SIDE: o.hide_render = c in (DOOR, SIDE)
            if o.name.startswith(SEATS): o.hide_render = (c is SIDE)
            if o.name.startswith(SEAT_BACKS_AND_PARTITION): o.hide_render = c in (FRONT, SIDE) or o.name in near
            if o.name == 'body': o.hide_render = (c is SIDE)
        sc.camera = c; sc.render.resolution_x, sc.render.resolution_y = w, h
        sc.render.filepath = os.path.join(OUT, f'{prefix}_{c.name}.png')
        t = time.time(); bpy.ops.render.render(write_still=True); print(f'TIME {prefix}_{c.name}_s {time.time() - t:.2f}')
    for o in bpy.data.objects: o.hide_render = False

EYE_BOX = ((-0.61, -0.07, 0.82), (0.61, 0.6, 1.26))
def measure():
    dg = bpy.context.evaluated_depsgraph_get()
    def pts(name): o = bpy.data.objects[name]; return [o.matrix_world @ v.co for v in o.evaluated_get(dg).data.vertices]
    def top_at(name, y):
        o = bpy.data.objects[name]; me = o.evaluated_get(dg).data; best = -1.0
        for e in me.edges:
            p, q = (o.matrix_world @ me.vertices[i].co for i in e.vertices)
            if (p.y - y) * (q.y - y) <= 0 and p.y != q.y: best = max(best, p.z + (q.z - p.z) * (y - p.y) / (q.y - p.y))
        return best
    ws = max(p.y for p in pts('dashDeck')); front = max(p.y for p in pts('glass1'))
    feet = [p.y for p in pts('bpillar1')[:16]]; bp_front, bp_rear = max(feet), min(feet)
    print(f'MEASURE windscreen base y {ws:.3f}, B-pillar foot y {bp_rear:.3f} to {bp_front:.3f}: {ws - bp_front:.3f} to {ws - bp_rear:.3f} m')
    print(f'MEASURE door at the sill, side glass front corner y {front:.3f} to the B-pillar foot rear edge: {front - bp_rear:.3f} m')
    print(f'MEASURE sill height {top_at("door1", front - 0.001):.3f} m at the door front, {top_at("door1", bp_rear):.3f} m at its rear')
    print(f'MEASURE partition y {max(p.y for p in pts("partition")):.3f}, screen y {SCY:.3f}, seat cushion top z {SEAT_Z:.3f}')
    print('MEASURE faces', {n: len(bpy.data.objects[n].evaluated_get(dg).data.polygons) for n in ('door1', 'door-1')})
    lo, hi = EYE_BOX
    inside = {o.name for o in static + glass if any(all(lo[i] < p[i] < hi[i] for i in range(3)) for p in pts(o.name))}
    backs = {o.name for parts in SEAT_BACK_PARTS.values() for o in parts}
    print('MEASURE inside the eye box:', sorted(inside - backs) or 'nothing', '| seat backs, hidden near the eye:', sorted(inside & backs) or 'none')

ORBIT_MARGIN = 0.02
ORBIT_R = ORBIT_C[1] - EYE_BOX[0][1] - ORBIT_MARGIN
POLAR = [math.acos((EYE_BOX[i][2] - m - ORBIT_C[2]) / ORBIT_R) for i, m in ((1, ORBIT_MARGIN), (0, -ORBIT_MARGIN))]
AZIMUTH = math.asin((EYE_BOX[1][0] - ORBIT_MARGIN) / ORBIT_R)
FOV, MIN_FOV_ACROSS = 60, 40
ZOOM_D = (SH / (2 * math.tan(math.radians(FOV / 2)) * 0.62), SW / (2 * math.tan(math.radians(MIN_FOV_ACROSS / 2)) * 0.9))
VIEW_TAN = (math.tan(math.radians(MIN_FOV_ACROSS / 2)), math.tan(math.radians(FOV / 2)))
ASPECTS = (0.28, 4.76)
REACH = (VIEW_TAN[1] * ASPECTS[1], VIEW_TAN[0] / ASPECTS[0])
RAY_STEP = math.radians(0.5)
SWAY = (0.004, 0.004)
MARGIN = 6
PACK_MARGIN = MARGIN / SIZE
UNSEEN, NEAR, FAR = 0.125, 0.3, 0.9
UNSEEN_MARGIN = 0.0005
KEEP = 0.03
def page_eyes(n_az=29, n_polar=15):
    out = []; centre = Vector(ORBIT_C); screen = Vector((0, SCY, SCZ))
    sways = [Vector((sx * SWAY[0], 0, sz * SWAY[1])) for sx in (-1, 1) for sz in (-1, 1)]
    def eye(az, polar): return centre + ORBIT_R * Vector((math.sin(polar) * math.sin(az), -math.sin(polar) * math.cos(az), math.cos(polar)))
    def add(at, target, edge):
        out.append((at, target))
        if edge: out.extend((at + s, target + s) for s in sways)
    for i in range(n_az):
        for j in range(n_polar):
            add(eye(AZIMUTH * (2 * i / (n_az - 1) - 1), POLAR[0] + (POLAR[1] - POLAR[0]) * j / (n_polar - 1)), centre,
                i in (0, n_az - 1) or j in (0, n_polar - 1))
    for az, polar in ((-AZIMUTH, POLAR[0]), (AZIMUTH, POLAR[0]), (-AZIMUTH, POLAR[1]), (AZIMUTH, POLAR[1]), (-0.3881, 1.4802)):
        for d in ZOOM_D:
            for z in (0.25, 0.5, 0.75, 1.0): add(eye(az, polar).lerp(Vector((0, SCY - d, SCZ)), z), centre.lerp(screen, z), True)
    return out
def view_rays():
    out = []; step = math.tan(RAY_STEP)
    def fan(reach):
        top = math.atan(reach); n = math.ceil(2 * top / RAY_STEP); return [math.tan(top * (2 * (a + 0.5) / n - 1)) for a in range(n)]
    def even(half): n = math.ceil(2 * half / step); return [half * (2 * (b + 0.5) / n - 1) for b in range(n)]
    out += [(a, b) for a in fan(REACH[0]) for b in even(VIEW_TAN[1])]
    out += [(a, b) for b in fan(REACH[1]) if abs(b) > VIEW_TAN[1] for a in even(VIEW_TAN[0])]
    return out
def in_view(across, up, along):
    return along > 0 and ((across <= REACH[0] * along and up <= VIEW_TAN[1] * along) or (across <= VIEW_TAN[0] * along and up <= REACH[1] * along))
def seen_from_page(cabin):
    from mathutils.bvhtree import BVHTree
    me = cabin.data; W = cabin.matrix_world; co = [W @ v.co for v in me.vertices]; polys = [tuple(p.vertices) for p in me.polygons]
    back_of = {}
    for name in SEAT_BACK_PARTS:
        g = cabin.vertex_groups[name].index; inside = {v.index for v in me.vertices if any(e.group == g for e in v.groups)}
        back_of.update({i: name for i, p in enumerate(polys) if all(v in inside for v in p)})
    boxes = {}
    for name in SEAT_BACK_PARTS:
        P = [co[v] for i, n in back_of.items() if n == name for v in polys[i]]
        boxes[name] = [(min(p[k] for p in P), max(p[k] for p in P)) for k in range(3)]
    sv = [scr.matrix_world @ v.co for v in scr.data.vertices]; n0 = len(co)
    trees = {}
    def tree(hidden):
        if hidden not in trees:
            keep = [i for i in range(len(polys)) if back_of.get(i) not in hidden]
            trees[hidden] = (BVHTree.FromPolygons(co + sv, [polys[i] for i in keep] + [tuple(n0 + v for v in scr.data.polygons[0].vertices)]), keep)
        return trees[hidden]
    dist = [None] * len(polys); centre = [W @ p.center for p in me.polygons]; missed = None; rays = view_rays()
    for eye, target in page_eyes():
        hidden = frozenset(n for n, b in boxes.items() if math.hypot(*(max(lo - eye[k], 0, eye[k] - hi) for k, (lo, hi) in enumerate(b))) < SEAT_BACK_NEAR)
        bvh, keep = tree(hidden)
        f = (target - eye).normalized(); r = f.cross(Vector((0, 0, 1))).normalized(); u = r.cross(f)
        for ta, tb in rays:
            _, _, i, d = bvh.ray_cast(eye, f + r * ta + u * tb)
            if i is not None and i < len(keep) and (dist[keep[i]] is None or d < dist[keep[i]]): dist[keep[i]] = d
        slot = {i: k for k, i in enumerate(keep)}
        for i in range(len(polys)) if missed is None else missed:
            if i not in slot: continue
            v = centre[i] - eye; along = v.dot(f)
            if not in_view(abs(v.dot(r)), abs(v.dot(u)), along): continue
            _, _, j, d = bvh.ray_cast(eye, v)
            if j == slot[i] and (dist[i] is None or d < dist[i]): dist[i] = d
        if missed is None: missed = [i for i in range(len(polys)) if dist[i] is None]
    return dist
PART_NAMES = []
def unwrap():
    import numpy as np
    from bpy_extras.mesh_utils import mesh_linked_uv_islands
    from mathutils.kdtree import KDTree
    for name, parts in SEAT_BACK_PARTS.items():
        for o in parts: o.vertex_groups.new(name=name).add(range(len(o.data.vertices)), 1.0, 'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    for o in static: o.select_set(True)
    bpy.context.view_layer.objects.active = static[0]
    bpy.ops.object.convert(target='MESH')
    PART_NAMES[:] = [o.name for o in static]
    for k, o in enumerate(static):
        a = o.data.attributes.new('part', 'INT', 'FACE'); a.data.foreach_set('value', [k] * len(o.data.polygons))
    bpy.ops.object.join(); cabin = bpy.context.object; cabin.name = 'Cabin'; me = cabin.data
    while me.uv_layers: me.uv_layers.remove(me.uv_layers[0])
    first = me.uv_layers.new(name='UVMap')
    first.data.foreach_set('uv', [0.0] * (2 * len(first.data)))
    uv = me.uv_layers.new(name='Lightmap'); me.uv_layers.active = uv
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004); bpy.ops.object.mode_set(mode='OBJECT')
    dist = seen_from_page(cabin); W = cabin.matrix_world
    uv = me.uv_layers['Lightmap']              # the layer as it is after edit mode
    uvs = np.empty(2 * len(uv.data), dtype=np.float32); uv.data.foreach_get('uv', uvs); uvs = uvs.reshape(-1, 2)
    centre = [W @ p.center for p in me.polygons]; faces_of = {}; count = {True: 0, False: 0}
    for p in me.polygons:
        for key in p.edge_keys: faces_of.setdefault(key, []).append(p.index)
    for island in mesh_linked_uv_islands(me):
        seen = [i for i in island if dist[i] is not None]
        if seen and len(seen) < len(island):
            kd = KDTree(len(seen))
            for k, i in enumerate(seen): kd.insert(centre[i], k)
            kd.balance()
            for i in island:
                if dist[i] is None:
                    _, k, gap = kd.find(centre[i])
                    if gap < KEEP: dist[i] = dist[seen[k]]
        left = set(island)
        while left:
            start = left.pop(); piece = [start]; kind = dist[start] is None
            for i in piece:
                for key in me.polygons[i].edge_keys:
                    for j in faces_of[key]:
                        if j in left and (dist[j] is None) == kind: left.discard(j); piece.append(j)
            scale = UNSEEN if kind else math.sqrt(FAR / min(max(min(dist[i] for i in piece), NEAR), FAR)); count[kind] += 1
            loops = [l for i in piece for l in me.polygons[i].loop_indices]; c = uvs[loops].mean(axis=0)
            uvs[loops] = c + (uvs[loops] - c) * scale
    print('MEASURE pieces seen', count[False], 'unseen', count[True])
    unseen = np.array([d is None for d in dist]); loop_face = np.repeat(np.arange(len(me.polygons)), [p.loop_total for p in me.polygons])
    hidden = unseen[loop_face]
    def pack(faces, margin):
        uv = me.uv_layers['Lightmap']; uv.data.foreach_set('uv', uvs.ravel())
        me.polygons.foreach_set('select', faces); me.edges.foreach_set('select', np.zeros(len(me.edges), dtype=bool))
        me.vertices.foreach_set('select', np.zeros(len(me.vertices), dtype=bool))
        bpy.context.tool_settings.mesh_select_mode = (False, False, True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.hide(unselected=True)
        bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.pack_islands(rotate=True, scale=True, margin_method='FRACTION', margin=margin)
        bpy.ops.mesh.reveal(); bpy.ops.object.mode_set(mode='OBJECT')
        out = np.empty(2 * len(me.loops), dtype=np.float32); me.uv_layers['Lightmap'].data.foreach_get('uv', out); out = out.reshape(-1, 2)
        if (np.abs(out - uvs)[~faces[loop_face]] > 1e-6).any(): sys.exit('the lightmap UVs: a pack moved faces it was not given')
        return out
    packed = pack(unseen, UNSEEN_MARGIN); lo = packed[hidden].min(axis=0); size = packed[hidden].max(axis=0) - lo
    def girth(q): return sum(float(np.linalg.norm(q[list(p.loop_indices)] - np.roll(q[list(p.loop_indices)], 1, axis=0), axis=1).sum())
                             for p in me.polygons if unseen[p.index])
    grow = girth(uvs) / girth(packed)
    block = (packed[hidden] - lo) * grow; size = size * grow
    proxy = next(p for p in me.polygons if unseen[p.index] and p.loop_total == 4); corners = list(proxy.loop_indices)
    uvs[corners] = [(0, 0), (size[0], 0), (size[0], size[1]), (0, size[1])]
    faces = ~unseen; faces[proxy.index] = True
    packed = pack(faces, PACK_MARGIN); o = packed[corners[0]]; ex = (packed[corners[1]] - o) / size[0]; ey = (packed[corners[3]] - o) / size[1]
    uvs[:] = packed; uvs[hidden] = o + block[:, :1] * ex + block[:, 1:] * ey
    inside = np.linalg.solve(np.array([ex * size[0], ey * size[1]]).T, (uvs[~hidden] - o).T).T
    if ((inside > 0.001) & (inside < 0.999)).all(axis=1).any() or uvs.min() < -1e-4 or uvs.max() > 1 + 1e-4:
        sys.exit('the lightmap UVs: a seen face lies in the unseen block, or a face lies off the map')
    me.uv_layers['Lightmap'].data.foreach_set('uv', uvs.ravel())
    me.polygons.foreach_set('select', np.ones(len(me.polygons), dtype=bool))
    return cabin, dist
def measure_uv(cabin, dist):
    import numpy as np, re
    me = cabin.data; n = len(me.polygons); W = cabin.matrix_world
    uvs = np.empty(2 * len(me.uv_layers['Lightmap'].data), dtype=np.float64); me.uv_layers['Lightmap'].data.foreach_get('uv', uvs); uvs = uvs.reshape(-1, 2)
    area = np.zeros(n); uv_area = np.zeros(n); part = np.zeros(n, dtype=np.int32); me.attributes['part'].data.foreach_get('value', part)
    for p in me.polygons:
        P = [W @ me.vertices[v].co for v in p.vertices]; q = uvs[list(p.loop_indices)]
        area[p.index] = sum((P[k] - P[0]).cross(P[k + 1] - P[0]).length for k in range(1, len(P) - 1)) / 2
        uv_area[p.index] = abs(sum(q[k][0] * q[(k + 1) % len(q)][1] - q[(k + 1) % len(q)][0] * q[k][1] for k in range(len(q)))) / 2
    seen = np.array([d is not None for d in dist]); texel = np.sqrt(area / np.maximum(uv_area, 1e-12)) / SIZE * 1000
    def median(mask):
        if not mask.any() or area[mask].sum() == 0: return float('nan')
        order = np.argsort(texel[mask]); w = np.cumsum(area[mask][order]); return float(texel[mask][order][np.searchsorted(w, w[-1] / 2)])
    stems = {}
    for k, o in enumerate(PART_NAMES): stems.setdefault(re.match(r'[A-Za-z]+', o).group(), []).append(k)
    print(f'MEASURE lightmap {SIZE} px: {area.sum():.2f} m2 on {uv_area.sum() * 100:.1f}% of the map; never seen from the page '
          f'{area[~seen].sum() / area.sum() * 100:.1f}% of the area on {uv_area[~seen].sum() / uv_area.sum() * 100:.1f}% of the covered map; '
          f'median texel {median(seen):.2f} mm seen, {median(~seen):.2f} mm unseen')
    for stem, ks in sorted(stems.items(), key=lambda kv: -uv_area[np.isin(part, kv[1])].sum()):
        m = np.isin(part, ks); near = min((dist[i] for i in np.flatnonzero(m) if dist[i] is not None), default=float('nan'))
        print(f'MEASURE uv {stem:12} {area[m].sum():6.3f} m2, seen {area[m & seen].sum() / max(area[m].sum(), 1e-12) * 100:5.1f}%, nearest eye {near:5.2f} m, '
              f'map share {uv_area[m].sum() / uv_area.sum() * 100:5.1f}% (unseen faces {uv_area[m & ~seen].sum() / uv_area.sum() * 100:4.1f}%), '
              f'texel {median(m & seen):5.2f} mm seen, {median(m & ~seen):5.2f} mm unseen')

if MODE == 'wb':
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.show_cavity = True
    sc.display.shading.show_object_outline = False
    sc.view_settings.exposure = 1.6
    sc.world = bpy.data.worlds.new('wb'); sc.world.color = (0.75, 0.78, 0.82)
    M['glass'].diffuse_color = (0.22, 0.23, 0.25, 1)
    shoot('wb')
    measure()
    sys.exit(0)

if MODE == 'uv':
    measure_uv(*unwrap())
    sys.exit(0)

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
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.95, 0.97, 1.0, 1); bg.inputs['Strength'].default_value = 0.6
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 4.0; sun.data.angle = math.radians(1.5); sun.data.color = (1.0, 0.96, 0.9)
sun.rotation_euler = (math.radians(-35), 0, math.radians(20))
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60)
road = finish(mesh_from('road', bm), 'road', keep=False, smooth=False)

sc.cycles.samples = 64; sc.cycles.use_denoising = True
shoot('day')

for o in glass: o.hide_render = True
cabin, _ = unwrap()

def bake(tag):
    img = bpy.data.images.new(f'light_{tag}', SIZE, SIZE, float_buffer=True)
    img.colorspace_settings.name = 'Non-Color'
    for m in cabin.data.materials:
        n = m.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; m.node_tree.nodes.active = n
        u = m.node_tree.nodes.new('ShaderNodeUVMap'); u.uv_map = 'Lightmap'; m.node_tree.links.new(u.outputs['UV'], n.inputs['Vector'])
    sc.cycles.samples = SAMPLES; sc.render.bake.margin = MARGIN
    sc.render.bake.use_pass_direct = True; sc.render.bake.use_pass_indirect = True; sc.render.bake.use_pass_color = False
    t = time.time(); bpy.ops.object.bake(type='DIFFUSE'); print(f'TIME bake_{tag}_s {time.time() - t:.1f} size {SIZE} samples {SAMPLES}')
    img.filepath_raw = os.path.join(OUT, f'light_{tag}.hdr'); img.file_format = 'HDR'; img.save()
    for m in cabin.data.materials:
        for n in [n for n in m.node_tree.nodes if n.type in ('TEX_IMAGE', 'UVMAP')]: m.node_tree.nodes.remove(n)

AMBIENT = {'foot': 3.0, 'bar': 10.0, 'strip': 6.0}
DOME = 1.5
def emission(k, strength): M[k].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = strength

bake('day')
bg.inputs['Color'].default_value = (0.25, 0.35, 0.6, 1); bg.inputs['Strength'].default_value = 0.05; sun.hide_render = True
lamp = bpy.data.objects.new('street', bpy.data.lights.new('street', 'AREA')); sc.collection.objects.link(lamp)
lamp.data.energy = 120; lamp.data.size = 1.0; lamp.data.color = (1.0, 0.75, 0.45); lamp.location = (3.0, 0.6, 4.0)
lamp.rotation_euler = (Vector((0, SEAT_Y + 0.3, 0.8)) - lamp.location).to_track_quat('-Z', 'Y').to_euler()
bake('night')
bg.inputs['Strength'].default_value = 0.0; lamp.hide_render = True
emission('strip', AMBIENT['strip']); emission('ambient', AMBIENT['bar'])
foot = bpy.data.objects.new('footLight', bpy.data.lights.new('footLight', 'AREA')); sc.collection.objects.link(foot)
foot.data.shape = 'RECTANGLE'; foot.data.size = 2 * (SLAB_X - 0.12); foot.data.size_y = 0.012; foot.data.energy = AMBIENT['foot']
foot.location = (0, DASH_Y + 0.03, DASH_LOW - 0.006); foot.rotation_euler = (math.radians(-20), 0, 0)
bake('ambient')
for k in ('strip', 'ambient'): emission(k, 0)
foot.hide_render = True
M['dome'].node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (1, 1, 1, 1); emission('dome', DOME)
bake('dome')
emission('dome', 0)

seat_backs = []
for name in SEAT_BACK_PARTS:
    bpy.ops.object.select_all(action='DESELECT'); cabin.select_set(True); bpy.context.view_layer.objects.active = cabin
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT')
    cabin.vertex_groups.active = cabin.vertex_groups[name]; bpy.ops.object.vertex_group_select()
    bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
    part = next(o for o in bpy.context.selected_objects if o is not cabin); part.name = part.data.name = name
    seat_backs.append(part)
for o in (cabin, *seat_backs): o.vertex_groups.clear()
bpy.ops.object.select_all(action='DESELECT')
for o in glass: o.hide_render = False; o.select_set(True)
bpy.context.view_layer.objects.active = glass[0]
bpy.ops.object.join(); side_glass = bpy.context.object; side_glass.name = 'Glass'
bpy.ops.object.select_all(action='DESELECT')
for o in (cabin, scr, side_glass, *seat_backs): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'cabin.glb'), use_selection=True, export_format='GLB', export_yup=True, export_texcoords=True, export_apply=True)
print('DONE', len(cabin.data.polygons), 'faces;', ', '.join(f'{o.name} {len(o.data.polygons)}' for o in seat_backs))
