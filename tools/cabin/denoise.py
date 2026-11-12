# Denoise baked lightmaps with OIDN through Blender's compositor (CPU, no Cycles). Run in headless Blender:
#   blender -b --factory-startup --python denoise.py                              out/light_{day,night}.hdr -> *_dn.hdr
#   blender -b --factory-startup --python denoise.py -- <in.hdr> <out.hdr> ...    explicit pairs
import bpy, sys, os, time

OUT = os.environ.get('CABIN_OUT') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(args) % 2: sys.exit('give <in.hdr> <out.hdr> pairs')
pairs = list(zip(args[0::2], args[1::2])) or [
    (os.path.join(OUT, f'light_{tag}.hdr'), os.path.join(OUT, f'light_{tag}_dn.hdr')) for tag in ('day', 'night')]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.image_settings.file_format = 'HDR'
sc.view_settings.view_transform = 'Standard'
# Blender 5: the compositor is a node group assigned to the scene
tree = bpy.data.node_groups.new('denoise', 'CompositorNodeTree'); sc.compositing_node_group = tree
n_img = tree.nodes.new('CompositorNodeImage')
n_dn = tree.nodes.new('CompositorNodeDenoise')
tree.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
n_out = tree.nodes.new('NodeGroupOutput')
tree.links.new(n_img.outputs['Image'], n_dn.inputs['Image']); tree.links.new(n_dn.outputs['Image'], n_out.inputs[0])

for src, dst in pairs:
    img = bpy.data.images.load(src); n_img.image = img
    sc.render.resolution_x, sc.render.resolution_y = img.size; sc.render.resolution_percentage = 100
    sc.render.filepath = dst
    t = time.time(); bpy.ops.render.render(write_still=True); print(f'TIME denoise_s {time.time() - t:.1f}', dst)
