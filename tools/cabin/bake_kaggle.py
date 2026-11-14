#!/usr/bin/env python3
"""Bake the Cabin on a Kaggle GPU notebook and download the outputs. Needs Python 3 and the Kaggle CLI.

    python3 tools/cabin/bake_kaggle.py [size, default 2048] [samples, default 256]

Pushes cabin.py inside a script kernel, waits for the run, and downloads cabin.glb, light_day.hdr,
light_night.hdr, the Cycles day renders and the run log into $CABIN_OUT (or out/ beside this file).
Denoised lightmaps (light_*_dn.hdr) left there by an earlier bake are removed.
The Kaggle CLI is `kaggle` on PATH, or the path in $KAGGLE.
"""
import json, os, re, secrets, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('CABIN_OUT') or os.path.join(HERE, 'out')
KAGGLE = os.environ.get('KAGGLE', 'kaggle')
KERNEL = 'kihyun1998/cabin-bake-prototype'
BLENDER = 'https://download.blender.org/release/Blender5.3/blender-5.3.0-linux-x64.tar.xz'
SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 2048
SAMPLES = int(sys.argv[2]) if len(sys.argv) > 2 else 256
POLL_S, TIMEOUT_S = 10, 20 * 60

# The script the kernel runs: fetch Blender, write cabin.py, bake, leave only the outputs in /kaggle/working.
KERNEL_SCRIPT = '''import os, subprocess, time
t0 = time.time(); os.chdir('/kaggle/working')
print('RUN', {run!r}, flush=True)
subprocess.run('nvidia-smi --query-gpu=name --format=csv,noheader', shell=True)
subprocess.run('wget -q {blender} -O b.tar.xz && mkdir blender && tar -xf b.tar.xz -C blender --strip-components=1 && rm b.tar.xz', shell=True, check=True)
subprocess.run('apt-get -qq install -y libxkbcommon0 libsm6 libxi6 libxxf86vm1 libxfixes3 libxrender1 libgl1 >/dev/null 2>&1', shell=True)
print('SETUP_S', round(time.time() - t0, 1), flush=True)
open('cabin.py', 'w').write({source!r})
r = subprocess.run(['./blender/blender', '-b', '--factory-startup', '--python', 'cabin.py', '--', 'bake', '{size}', '{samples}'],
                   capture_output=True, text=True, env=dict(os.environ, CABIN_OUT='/kaggle/working'))
print('\\n'.join(l for l in r.stdout.splitlines() if l.startswith(('TIME', 'DONE', 'DEVICE'))), flush=True)
if 'DONE' not in r.stdout: print(r.stdout[-4000:]); print(r.stderr[-3000:])
subprocess.run('rm -rf blender cabin.py', shell=True)
print('TOTAL_S', round(time.time() - t0, 1))
'''

def kaggle(*args):
    r = subprocess.run([KAGGLE, *args], capture_output=True, text=True)
    if r.returncode: sys.exit(f'kaggle {" ".join(args)} failed:\n{r.stdout}{r.stderr}')
    return r.stdout

def log_lines():
    """the kernel's stdout lines from the downloaded log, or [] when there is none yet"""
    path = os.path.join(OUT, KERNEL.split('/')[1] + '.log')
    if not os.path.isfile(path): return []
    with open(path) as f: records = json.load(f)
    return ''.join(r['data'] for r in records if r['stream_name'] == 'stdout').splitlines()

run = secrets.token_hex(4)
with open(os.path.join(HERE, 'cabin.py')) as f: source = f.read()
with tempfile.TemporaryDirectory() as kernel:
    with open(os.path.join(kernel, 'run.py'), 'w') as f:
        f.write(KERNEL_SCRIPT.format(run=run, blender=BLENDER, source=source, size=SIZE, samples=SAMPLES))
    with open(os.path.join(kernel, 'kernel-metadata.json'), 'w') as f:
        json.dump({'id': KERNEL, 'title': KERNEL.split('/')[1], 'code_file': 'run.py', 'language': 'python',
                   'kernel_type': 'script', 'is_private': True, 'enable_gpu': True, 'enable_internet': True,
                   'dataset_sources': [], 'competition_sources': [], 'kernel_sources': []}, f)
    print(kaggle('kernels', 'push', '-p', kernel).strip(), flush=True)

t0 = time.time(); status = None
while True:
    if time.time() - t0 > TIMEOUT_S: sys.exit(f'gave up after {TIMEOUT_S} s; last status {status}')
    time.sleep(POLL_S)
    m = re.search(r'status "(?:\w+\.)?(\w+)"', kaggle('kernels', 'status', KERNEL))
    if m and m.group(1) != status: status = m.group(1); print(f'{time.time() - t0:5.0f} s  {status}', flush=True)
    if not status or not re.match(r'COMPLETE|ERROR|CANCEL', status): continue
    os.makedirs(OUT, exist_ok=True)
    kaggle('kernels', 'output', KERNEL, '-p', OUT, '-o', '-q')
    lines = log_lines()
    if f'RUN {run}' not in lines: continue   # the status and the log are an earlier version's
    if status != 'COMPLETE': sys.exit(f'the kernel run ended with {status}; see the log in {OUT}')
    break

print('\n'.join(l for l in lines if l.startswith(('SETUP_S', 'DEVICE', 'TIME', 'DONE', 'TOTAL_S'))))
missing = [n for n in ('cabin.glb', 'light_day.hdr', 'light_night.hdr') if not os.path.isfile(os.path.join(OUT, n))]
if missing or not any(l.startswith('DONE') for l in lines):
    sys.exit(f'the bake did not finish (missing: {", ".join(missing) or "nothing"}); see the log in {OUT}')
for tag in ('day', 'night'):
    stale = os.path.join(OUT, f'light_{tag}_dn.hdr')
    if os.path.isfile(stale): os.remove(stale)
print('downloaded to', OUT)
