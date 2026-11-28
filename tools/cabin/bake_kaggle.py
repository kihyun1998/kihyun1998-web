#!/usr/bin/env python3
import json, os, re, secrets, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('CABIN_OUT') or os.path.join(HERE, 'out')
KAGGLE = os.environ.get('KAGGLE', 'kaggle')
KERNEL = 'kihyun1998/cabin-bake'
BLENDER = 'https://download.blender.org/release/Blender5.3/blender-5.3.0-linux-x64.tar.xz'
BLENDER_SHA256 = 'https://download.blender.org/release/Blender5.3/blender-5.3.0.sha256'
SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 2048
SAMPLES = int(sys.argv[2]) if len(sys.argv) > 2 else 256
POLL_S, UNSEEN_LIMIT_S, QUEUED_LIMIT_S, RUNNING_LIMIT_S = 10, 20 * 60, 3 * 60 * 60, 20 * 60
RETRY_S = (15, 30, 60, 120)

KERNEL_SCRIPT = '''import hashlib, os, subprocess, sys, time, urllib.request
t0 = time.time(); os.chdir('/kaggle/working')
print('RUN', {run!r}, flush=True)
subprocess.run('nvidia-smi --query-gpu=name --format=csv,noheader', shell=True)
name = {blender!r}.rsplit('/', 1)[1]
with urllib.request.urlopen({blender_sha256!r}, timeout=60) as r: sums = r.read().decode()
want = next((l.split()[0] for l in sums.splitlines() if l.split()[1:] == [name]), None)
got = hashlib.sha256()
with urllib.request.urlopen({blender!r}, timeout=60) as r, open('b.tar.xz', 'wb') as f:
    for chunk in iter(lambda: r.read(1 << 20), b''): got.update(chunk); f.write(chunk)
if got.hexdigest() != want:
    print('FAIL', name, 'has SHA-256', got.hexdigest(), 'but', {blender_sha256!r}, 'lists', want or 'no SHA-256 for it', flush=True)
    os.remove('b.tar.xz'); sys.exit(1)
print('BLENDER_SHA256', want, flush=True)
subprocess.run('mkdir blender && tar -xf b.tar.xz -C blender --strip-components=1 && rm b.tar.xz', shell=True, check=True)
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

def kaggle(*args, retry=False):
    for wait in (*RETRY_S, None) if retry else (None,):
        r = subprocess.run([KAGGLE, *args], capture_output=True, text=True)
        if not r.returncode: return r.stdout
        if wait is None: sys.exit(f'kaggle {" ".join(args)} failed:\n{r.stdout}{r.stderr}')
        first = (r.stderr.strip() or r.stdout.strip() or 'no output').splitlines()[0]
        print(f'kaggle {" ".join(args[:2])} failed ({first}); retrying in {wait} s', flush=True)
        time.sleep(wait)

def log_lines():
    path = os.path.join(OUT, KERNEL.split('/')[1] + '.log')
    if not os.path.isfile(path): return []
    with open(path) as f: records = json.load(f)
    return ''.join(r['data'] for r in records if r['stream_name'] == 'stdout').splitlines()

run = secrets.token_hex(4)
with open(os.path.join(HERE, 'cabin.py')) as f: source = f.read()
with tempfile.TemporaryDirectory() as kernel:
    with open(os.path.join(kernel, 'run.py'), 'w') as f:
        f.write(KERNEL_SCRIPT.format(run=run, blender=BLENDER, blender_sha256=BLENDER_SHA256, source=source,
                                     size=SIZE, samples=SAMPLES))
    with open(os.path.join(kernel, 'kernel-metadata.json'), 'w') as f:
        json.dump({'id': KERNEL, 'title': KERNEL.split('/')[1], 'code_file': 'run.py', 'language': 'python',
                   'kernel_type': 'script', 'is_private': True, 'enable_gpu': True, 'enable_internet': True,
                   'dataset_sources': [], 'competition_sources': [], 'kernel_sources': []}, f)
    pushed = kaggle('kernels', 'push', '-p', kernel)
    if 'successfully pushed' not in pushed: sys.exit(f'kaggle kernels push failed:\n{pushed}')
    print(pushed.strip(), flush=True)

t0 = time.time(); seen = running = None; status = None
while True:
    if running is not None and time.time() - running > RUNNING_LIMIT_S:
        sys.exit(f'gave up after {RUNNING_LIMIT_S} s running; last status {status}')
    if running is None and seen and time.time() - t0 > QUEUED_LIMIT_S:
        sys.exit(f'gave up after {QUEUED_LIMIT_S} s without the run starting; last status {status}')
    if not seen and time.time() - t0 > UNSEEN_LIMIT_S:
        sys.exit(f'gave up after {UNSEEN_LIMIT_S} s: Kaggle still shows {status} from an earlier version')
    time.sleep(POLL_S)
    m = re.search(r'status "(?:\w+\.)?(\w+)"', kaggle('kernels', 'status', KERNEL, retry=True))
    if m and m.group(1) != status: status = m.group(1); print(f'{time.time() - t0:5.0f} s  {status}', flush=True)
    if status == 'RUNNING' and running is None: running = time.time()
    if not status or not re.match(r'COMPLETE|ERROR|CANCEL', status): seen = seen or bool(status); continue
    os.makedirs(OUT, exist_ok=True)
    kaggle('kernels', 'output', KERNEL, '-p', OUT, '-o', '-q', retry=True)
    lines = log_lines()
    if f'RUN {run}' not in lines:
        if not seen: continue
        sys.exit(f'the kernel run ended with {status} before its log showed this run; see the log in {OUT}')
    if status != 'COMPLETE':
        sys.exit('\n'.join([*(l for l in lines if l.startswith('FAIL')),
                            f'the kernel run ended with {status}; see the log in {OUT}']))
    break

print('\n'.join(l for l in lines if l.startswith(('BLENDER_SHA256', 'SETUP_S', 'DEVICE', 'TIME', 'DONE', 'TOTAL_S'))))
TAGS = ('day', 'night', 'ambient', 'dome')
missing = [n for n in ('cabin.glb', *(f'light_{tag}.hdr' for tag in TAGS)) if not os.path.isfile(os.path.join(OUT, n))]
if missing or not any(l.startswith('DONE') for l in lines):
    sys.exit(f'the bake did not finish (missing: {", ".join(missing) or "nothing"}); see the log in {OUT}')
for tag in TAGS:
    stale = os.path.join(OUT, f'light_{tag}_dn.hdr')
    if os.path.isfile(stale): os.remove(stale)
print('downloaded to', OUT)
