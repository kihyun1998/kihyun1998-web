// The Cabin as a three.js scene mounted into an element: the baked cabin drawn
// over a placeholder street that drives past, in day or night lighting, the
// orbit around the Cabin Screen, the screen's drawing and its presses, the
// zoom to the screen and back, and the resolution steps.
// Browser-only; the home page loads it on demand.
// See docs/adr/0011-home-is-a-cabin-over-a-reading-home.md and
// docs/map/home-room.md.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import manifest from '../../public/cabin/manifest.json';
import { fitOrbit, isTap, type Bounds, type Lighting, type PressPoint } from './cabin-rules';
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  layoutScreen,
  paintScreen,
  zoneAt,
  type ScreenState,
  type Zone,
} from './cabin-screen';
import type { HomeSectionId } from './home';
import type { Language } from './i18n';

export type CabinEvents = {
  // The Cabin is drawn and passed its frame test.
  onReady: () => void;
  // What the view shows: whether it is zoomed to the Cabin Screen, and the
  // screen's tab. Reported whenever either changes after the frame test has
  // passed; until then the view is at the seat and nothing is reported.
  onView: (view: CabinView) => void;
  // The Cabin ran over the frame budget at its lowest resolution.
  onFrameTestFailed: () => void;
  // The Cabin could not start: no context, an asset that did not load, or a
  // cabin the orbit does not fit.
  onError: (error: unknown) => void;
  // An item leading to a page of this site was pressed on the Cabin Screen.
  onNavigate: (href: string) => void;
};

export type CabinView = { zoomed: boolean; tab: HomeSectionId };

// What the Cabin starts with. `tab` set means it opens zoomed to the Cabin
// Screen on that tab. `fontFamily` is the CSS font family the screen's text
// is drawn in.
export type CabinStart = {
  lighting: Lighting;
  language: Language;
  tab: HomeSectionId | null;
  fontFamily: string;
};

export type Cabin = {
  zoomOut: () => void;
  // Opens `tab` on the Cabin Screen and zooms to it.
  showTab: (tab: HomeSectionId) => void;
  setLighting: (lighting: Lighting) => void;
  // The language of the Identity Statement on the Cabin Screen.
  setLanguage: (language: Language) => void;
  dispose: () => void;
  // Where the cameras are now: the gap between the drawn camera and the
  // controls' camera and the drawn camera's distance to the target, in
  // metres, and the controls' orbit angles, in radians.
  probe: () => {
    gap: number;
    distance: number;
    azimuth: number;
    polar: number;
    zoomed: boolean;
    pixelRatio: number;
    tab: HomeSectionId;
    // The lighting drawn now; it trails `setLighting` while a lightmap loads.
    lighting: Lighting;
    // How long the last drawing of the Cabin Screen took, in milliseconds,
    // without the texture upload.
    paintCost: number;
    // The Cabin Screen's pressable zones, each with the client position of
    // its centre.
    zones: { key: string; x: number; y: number }[];
  };
};

const ASSETS = '/cabin/';

// The box the eye stays in, in the cabin's metres: between the door cards,
// under the headliner, behind the dashboard and ahead of the seat backs.
const EYE_BOUNDS: Bounds = {
  min: { x: -0.61, y: 0.82, z: -0.6 },
  max: { x: 0.61, y: 1.26, z: -0.07 },
};

// The seat view the Cabin opens on, as orbit angles in radians.
const HOME_AZIMUTH = -0.4876;
const HOME_POLAR = 1.2123;

const FOV = 60;
// How much of the view's height and width the Cabin Screen fills when zoomed.
const ZOOM_FILL_HEIGHT = 0.62;
const ZOOM_FILL_WIDTH = 0.9;
const ZOOM_MS = 900;

// What changes with the lighting. `light` is the lightmap's level, on top of
// its stored scale and the π between a Cycles diffuse bake and three.js
// irradiance; `strip` and `dome` are the emissive levels of the dash light
// strip and the dome lights; the rest is the street's sky, fog and lights.
const LOOKS = {
  day: {
    light: 2.7,
    reflection: 0.4,
    strip: 0,
    dome: 0,
    top: '#4f8fd8',
    mid: '#cfe0ef',
    bot: '#8b8d86',
    fog: '#c8d6e3',
    fogNear: 60,
    fogFar: 420,
    sun: 2.8,
    sunColor: '#fff6ea',
    hemisphere: 1.1,
    environment: 0.7,
    lamps: 0,
  },
  night: {
    light: 2.4,
    reflection: 0.15,
    strip: 1.6,
    dome: 0.6,
    top: '#050817',
    mid: '#1b2347',
    bot: '#0e0f14',
    fog: '#151a2e',
    fogNear: 20,
    fogFar: 260,
    sun: 0.15,
    sunColor: '#8fa0ff',
    hemisphere: 0.12,
    environment: 0.1,
    lamps: 2.6,
  },
} satisfies Record<Lighting, object>;
const STRIP_GLOW = '#ffd9a8';
const DOME_GLOW = '#fff1dc';
const LAMP_GLOW = '#ffd9a6';

const PIXEL_RATIOS = [1.5, 1.25, 1];
// A frame's cost above which the resolution steps down, and above which, at
// the lowest step, the frame test fails. In milliseconds.
const STEP_DOWN_MS = 20;
const FRAME_BUDGET_MS = 1000 / 30;
// The frame test at each resolution: frames skipped, then frames timed.
const TEST_WARM_FRAMES = 3;
const TEST_FRAMES = 12;
// After the test: one frame in this many is timed, over this many timings.
const GOVERNOR_EVERY = 30;
const GOVERNOR_FRAMES = 5;

// How far the cameras see, in metres: past the sky, which is a sphere of
// SKY_RADIUS round the eye.
const SKY_RADIUS = 900;
const FAR = 1500;
// Where the reflection of the outside is captured from: a seated passenger's
// eye height, between the two seats.
const REFLECTION_EYE = new THREE.Vector3(0, 1.15, -0.2);

const SPEED = 13.9; // m/s
// The car's speed at animation time `now`, in m/s.
const speedAt = (now: number) => SPEED * (1 + 0.15 * Math.sin(now / 9000));
// How often the Cabin Screen's clock and speed are read again, in ms.
const STATUS_EVERY = 1000;
const SEGMENT = 360; // the street repeats over this length, in metres
const ROAD_CENTRE = -1.75; // x of the road's centre line; the car is at x = 0

const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1];

type Street = {
  scene: THREE.Scene;
  sky: THREE.Mesh;
  // Moves everything `distance` metres toward the car.
  advance: (distance: number) => void;
  setLighting: (lighting: Lighting) => void;
};

type Placed = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color?: string;
  // Speed along the road relative to the street, in m/s; negative is oncoming.
  speed?: number;
};

// The placeholder street: sky, road, pavements, and rows of buildings, trees,
// lamps and oncoming cars that wrap over SEGMENT. It is in no lighting until
// `setLighting` is called.
function buildStreet(): Street {
  const scene = new THREE.Scene();
  const fog = new THREE.Fog('#000000', 1, 2);
  scene.fog = fog;

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(SKY_RADIUS, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color() },
        mid: { value: new THREE.Color() },
        bot: { value: new THREE.Color() },
      },
      vertexShader:
        'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform vec3 top, mid, bot; varying vec3 vP;
        void main(){ float y = normalize(vP).y;
          vec3 c = y > 0. ? mix(mid, top, smoothstep(0., .5, y)) : mix(mid, bot, smoothstep(0., .1, -y));
          gl_FragColor = vec4(c, 1.);
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(sky);

  const hemisphere = new THREE.HemisphereLight('#dfe8f5', '#4a4a44');
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight();
  sun.position.set(-40, 60, -30);
  scene.add(sun);

  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = roadCanvas.height = 512;
  const paint = roadCanvas.getContext('2d')!;
  paint.fillStyle = '#3a3c40';
  paint.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 50 + Math.random() * 30;
    paint.fillStyle = `rgb(${v},${v},${v + 3})`;
    paint.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  paint.fillStyle = '#e9e9e4';
  for (const x of [128, 384]) for (let y = 0; y < 512; y += 128) paint.fillRect(x - 3, y, 6, 64);
  paint.fillStyle = '#d8b54a';
  paint.fillRect(254, 0, 4, 512);
  paint.fillRect(262, 0, 4, 512);
  const roadTexture = new THREE.CanvasTexture(roadCanvas);
  roadTexture.colorSpace = THREE.SRGBColorSpace;
  roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.repeat.set(1, SEGMENT / 16);
  roadTexture.anisotropy = 8;

  const flat = (width: number, depth: number, material: THREE.Material, x: number, y: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, depth === SEGMENT ? -SEGMENT / 2 + 20 : 0);
    scene.add(mesh);
  };
  flat(14, SEGMENT, new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.9 }), ROAD_CENTRE, 0);
  flat(2000, 2000, new THREE.MeshStandardMaterial({ color: '#5d6457', roughness: 1 }), 0, -0.02);
  const pavement = new THREE.MeshStandardMaterial({ color: '#9a9a96', roughness: 0.95 });
  const kerb = new THREE.MeshStandardMaterial({ color: '#b8b8b2', roughness: 0.8 });
  for (const side of [-1, 1]) {
    flat(5, SEGMENT, pavement, ROAD_CENTRE + side * 9.5, 0.12);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, SEGMENT), kerb);
    edge.position.set(ROAD_CENTRE + side * 7.05, 0.07, -SEGMENT / 2 + 20);
    scene.add(edge);
  }

  const rows: { mesh: THREE.InstancedMesh; items: Placed[] }[] = [];
  const row = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number,
    place: (index: number) => Placed,
  ) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false;
    const items = Array.from({ length: count }, (_, index) => place(index));
    const color = new THREE.Color();
    items.forEach((item, index) => {
      if (item.color) mesh.setColorAt(index, color.set(item.color));
    });
    scene.add(mesh);
    rows.push({ mesh, items });
  };
  const side = (index: number) => (index % 2 ? 1 : -1);
  const along = (index: number, count: number, offset: number) => -(index / count) * SEGMENT + offset;

  const tones = ['#d9d4cb', '#c4c8cc', '#e6e2da', '#b9bec4', '#cfc6b8', '#a9aeb5'];
  row(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75 }), 80, (i) => {
    const height = 8 + Math.random() * 38;
    const width = 10 + Math.random() * 14;
    return {
      x: ROAD_CENTRE + side(i) * (16 + width / 2 + Math.random() * 6),
      y: height / 2,
      z: along(i, 80, 20),
      sx: width,
      sy: height,
      sz: 10 + Math.random() * 10,
      color: tones[i % tones.length],
    };
  });
  row(
    new THREE.CylinderGeometry(0.12, 0.16, 1, 6),
    new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 }),
    60,
    (i) => ({ x: ROAD_CENTRE + side(i) * 8.6, y: 1.4, z: along(i, 60, 20), sx: 1, sy: 2.8, sz: 1 }),
  );
  row(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: '#4f6b3e', roughness: 1, flatShading: true }),
    60,
    (i) => {
      const size = 1.6 + Math.random() * 0.7;
      return { x: ROAD_CENTRE + side(i) * 8.6, y: 3.8, z: along(i, 60, 20), sx: size, sy: size * 1.15, sz: size };
    },
  );
  row(
    new THREE.CylinderGeometry(0.07, 0.09, 1, 8),
    new THREE.MeshStandardMaterial({ color: '#3b3d41', roughness: 0.6, metalness: 0.4 }),
    30,
    (i) => ({ x: ROAD_CENTRE + side(i) * 7.6, y: 4, z: along(i, 30, 8), sx: 1, sy: 8, sz: 1 }),
  );
  const lampHeads = new THREE.MeshStandardMaterial({ color: '#222222', emissive: LAMP_GLOW });
  row(new THREE.BoxGeometry(1, 1, 1), lampHeads, 30, (i) => ({
    x: ROAD_CENTRE + side(i) * 6.6,
    y: 7.9,
    z: along(i, 30, 8),
    sx: 1.4,
    sy: 0.12,
    sz: 0.4,
  }));
  const paints = ['#cfd3d8', '#2a2c30', '#8a1c1c', '#f2f2f0', '#3a4f6a', '#5b5e63'];
  row(
    new RoundedBoxGeometry(1, 1, 1, 3, 0.25),
    new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5 }),
    6,
    (i) => ({
      x: ROAD_CENTRE - 1.75 - (i % 2) * 3.5,
      y: 0.75,
      z: along(i, 6, 0),
      sx: 1.9,
      sy: 1.4,
      sz: 4.4,
      color: paints[i],
      speed: -SPEED,
    }),
  );

  const matrix = new THREE.Matrix4();
  const upright = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const advance = (distance: number) => {
    roadTexture.offset.y += distance / 16;
    for (const { mesh, items } of rows) {
      items.forEach((item, index) => {
        item.z += distance * (1 - (item.speed ?? 0) / SPEED);
        if (item.z > 30) item.z -= SEGMENT;
        if (item.z < -SEGMENT + 30) item.z += SEGMENT;
        position.set(item.x, item.y, item.z);
        mesh.setMatrixAt(index, matrix.compose(position, upright, scale.set(item.sx, item.sy, item.sz)));
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  advance(0);

  const setLighting = (lighting: Lighting) => {
    const look = LOOKS[lighting];
    const { uniforms } = sky.material as THREE.ShaderMaterial;
    uniforms.top.value.set(look.top);
    uniforms.mid.value.set(look.mid);
    uniforms.bot.value.set(look.bot);
    fog.color.set(look.fog);
    fog.near = look.fogNear;
    fog.far = look.fogFar;
    sun.intensity = look.sun;
    sun.color.set(look.sunColor);
    hemisphere.intensity = look.hemisphere;
    scene.environmentIntensity = look.environment;
    lampHeads.emissiveIntensity = look.lamps;
  };

  return { scene, sky, advance, setLighting };
}

// The line in three.js's lightmap and environment chunk that adds the
// environment's diffuse light, and the chunk without it.
const ENVIRONMENT_DIFFUSE = 'iblIrradiance += getIBLIrradiance( geometryNormal );';
const REFLECTION_ONLY_CHUNK = THREE.ShaderChunk.lights_fragment_maps.replace(ENVIRONMENT_DIFFUSE, '');

// Makes a material take its diffuse light from the lightmap alone: the
// environment map then adds reflections and no diffuse light.
function reflectionOnly(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_maps>', REFLECTION_ONLY_CHUNK);
}

// Frees every geometry, material and texture under `root`.
function disposeTree(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

// Mounts the Cabin into `container` and starts loading it. Everything it
// reports comes through `events`; nothing is thrown.
export function mountCabin(container: HTMLElement, events: CabinEvents, from: CabinStart): Cabin {
  let disposed = false;
  let stop = () => {};
  let zoomOut = () => {};
  // What was last asked for; `show` brings the running scene in line with it.
  let lighting = from.lighting;
  let language = from.language;
  let tab: HomeSectionId = from.tab ?? 'about';
  // The Cabin passed its frame test; until then a zoom asked for waits.
  let ready = false;
  let zoomAsked = from.tab !== null;
  const show = { lighting: () => {}, language: () => {}, tab: () => {} };
  let probe: Cabin['probe'] = () => ({
    gap: 0,
    distance: 0,
    azimuth: 0,
    polar: 0,
    zoomed: false,
    pixelRatio: 0,
    tab,
    lighting,
    paintCost: 0,
    zones: [],
  });

  const fail = (error: unknown) => {
    if (disposed) return;
    disposed = true;
    stop();
    events.onError(error);
  };

  try {
    start();
  } catch (error) {
    fail(error);
  }

  function start() {
    if (!THREE.ShaderChunk.lights_fragment_maps.includes(ENVIRONMENT_DIFFUSE)) {
      throw new Error('three.js no longer has the environment diffuse line the Cabin removes.');
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const canvas = renderer.domElement;
    let frame = 0;
    // What to undo, in the order it was set up; `stop` undoes it backwards.
    const cleanups: (() => void)[] = [
      () => {
        renderer.forceContextLoss();
        renderer.dispose();
        canvas.remove();
      },
    ];
    stop = () => {
      cancelAnimationFrame(frame);
      for (const cleanup of cleanups.reverse()) cleanup();
      cleanups.length = 0;
    };
    const pixelRatios = PIXEL_RATIOS.filter((ratio) => ratio <= Math.max(1, window.devicePixelRatio));
    let step = 0;
    renderer.setPixelRatio(pixelRatios[step]);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.autoClear = false;
    canvas.style.display = 'block';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute(
      'aria-label',
      'The view from the passenger seat of a driverless car driving down a street, a screen hanging in front of its dashboard.',
    );
    container.appendChild(canvas);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const roomLight = pmrem.fromScene(room, 0.04);
    room.dispose();
    cleanups.push(() => {
      roomLight.dispose();
      pmrem.dispose();
    });
    const street = buildStreet();
    cleanups.push(() => disposeTree(street.scene));
    street.scene.environment = roomLight.texture;

    const cabinScene = new THREE.Scene();
    let reflection: THREE.WebGLRenderTarget | null = null;
    cleanups.push(() => {
      disposeTree(cabinScene);
      reflection?.dispose();
    });

    const draco = new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG);
    cleanups.push(() => draco.dispose());

    // Each lighting's lightmap, loaded when that lighting is first asked for.
    const lightmaps: Partial<Record<Lighting, Promise<THREE.Texture>>> = {};
    const lightmap = (which: Lighting) =>
      (lightmaps[which] ??= new THREE.TextureLoader()
        .loadAsync(ASSETS + manifest.lightmaps[which].file)
        .then(
          (light) => {
            light.flipY = false;
            light.channel = 1;
            light.colorSpace = THREE.SRGBColorSpace;
            if (disposed) light.dispose();
            else cleanups.push(() => light.dispose());
            return light;
          },
          (error) => {
            // The next request for this lighting fetches it again.
            delete lightmaps[which];
            throw error;
          },
        ));

    const first = lighting;
    Promise.all([
      new GLTFLoader().setDRACOLoader(draco).loadAsync(ASSETS + manifest.geometry),
      lightmap(first),
    ])
      .then(([gltf, light]) => {
        if (disposed) {
          disposeTree(gltf.scene);
          return;
        }
        run(gltf.scene, first, light);
      })
      .catch(fail);

    function run(cabin: THREE.Object3D, firstLighting: Lighting, firstLight: THREE.Texture) {
      // The Cabin Screen's drawing, kept as the canvas its texture reads.
      const screenCanvas = document.createElement('canvas');
      screenCanvas.width = SCREEN_WIDTH;
      screenCanvas.height = SCREEN_HEIGHT;
      const screenContext = screenCanvas.getContext('2d');
      if (!screenContext) throw new Error('The Cabin Screen has no 2D canvas to draw on.');
      const screenTexture = new THREE.CanvasTexture(screenCanvas);
      screenTexture.colorSpace = THREE.SRGBColorSpace;
      screenTexture.flipY = false;
      screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const measure = (text: string, font: string) => {
        screenContext.font = `${font} ${from.fontFamily}`;
        return screenContext.measureText(text).width;
      };
      let drawnLighting = firstLighting;
      let hover: string | null = null;
      let zones: Zone[] = [];
      let painted = '';
      let paintCost = 0;
      const paint = () => {
        const began = performance.now();
        const state: ScreenState = {
          tab,
          language,
          lighting: drawnLighting,
          hover,
          time: new Date().toTimeString().slice(0, 5),
          speed: speedAt(performance.now()) * 3.6,
        };
        const layout = layoutScreen(state, measure);
        zones = layout.zones;
        const next = JSON.stringify(layout.ops);
        if (next === painted) return;
        painted = next;
        paintScreen(screenContext, layout.ops, from.fontFamily);
        screenTexture.needsUpdate = true;
        paintCost = performance.now() - began;
      };
      // Text drawn before its font arrived is drawn again once it has.
      const repaint = () => {
        painted = '';
        paint();
      };
      const status = window.setInterval(paint, STATUS_EVERY);
      document.fonts.addEventListener('loadingdone', repaint);
      cleanups.push(() => {
        window.clearInterval(status);
        document.fonts.removeEventListener('loadingdone', repaint);
      });

      const lit: THREE.MeshStandardMaterial[] = [];
      const glows: { material: THREE.MeshStandardMaterial; level: 'strip' | 'dome' }[] = [];
      let screen: THREE.Mesh | null = null;
      cabin.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (mesh.name === 'Screen') {
          (mesh.material as THREE.Material).dispose();
          mesh.material = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
          screen = mesh;
          return;
        }
        // The side glass keeps its own tinted, see-through material and has no lightmap.
        if (mesh.name === 'Glass') return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          const standard = material as THREE.MeshStandardMaterial;
          standard.onBeforeCompile = reflectionOnly;
          standard.customProgramCacheKey = () => 'reflection-only';
          lit.push(standard);
          if (standard.name === 'strip') {
            standard.emissive.set(STRIP_GLOW);
            glows.push({ material: standard, level: 'strip' });
          } else if (standard.name === 'dome') {
            standard.emissive.set(DOME_GLOW);
            glows.push({ material: standard, level: 'dome' });
          }
        }
      });
      cabinScene.add(cabin);

      // Puts the street, the reflection of it, the cabin's light and the
      // Cabin Screen in `which` lighting, lit by `light`.
      const light = (which: Lighting, map: THREE.Texture) => {
        const look = LOOKS[which];
        street.setLighting(which);
        reflection?.dispose();
        reflection = pmrem.fromScene(street.scene, 0.04, 0.1, FAR, { position: REFLECTION_EYE });
        cabinScene.environment = reflection.texture;
        cabinScene.environmentIntensity = look.reflection;
        for (const material of lit) {
          material.lightMap = map;
          material.lightMapIntensity = look.light * manifest.lightmaps[which].scale * Math.PI;
        }
        for (const { material, level } of glows) material.emissiveIntensity = look[level];
        drawnLighting = which;
        paint();
      };
      light(firstLighting, firstLight);
      show.lighting = () => {
        const asked = lighting;
        lightmap(asked)
          .then((map) => {
            if (!disposed && lighting === asked && drawnLighting !== asked) light(asked, map);
          })
          .catch((error) => console.error('The Cabin could not load its lightmap.', error));
      };
      show.lighting();
      show.language = paint;
      if (!screen) throw new Error('The cabin has no mesh named Screen.');
      const screenMesh: THREE.Mesh = screen;

      const screenBox = new THREE.Box3().setFromObject(screenMesh);
      const target = screenBox.getCenter(new THREE.Vector3());
      const screenSize = screenBox.getSize(new THREE.Vector3());
      const orbit = fitOrbit(EYE_BOUNDS, target);

      // The controls own `camera`; the scene is drawn from `view`.
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.02, FAR);
      camera.position
        .setFromSphericalCoords(
          orbit.radius,
          THREE.MathUtils.clamp(HOME_POLAR, orbit.minPolar, orbit.maxPolar),
          THREE.MathUtils.clamp(HOME_AZIMUTH, orbit.minAzimuth, orbit.maxAzimuth),
        )
        .add(target);
      const controls = new OrbitControls(camera, canvas);
      controls.target.copy(target);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.rotateSpeed = 0.45;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.cursorStyle = 'grab';
      controls.minDistance = controls.maxDistance = orbit.radius;
      controls.minPolarAngle = orbit.minPolar;
      controls.maxPolarAngle = orbit.maxPolar;
      controls.minAzimuthAngle = orbit.minAzimuth;
      controls.maxAzimuthAngle = orbit.maxAzimuth;
      controls.update();
      cleanups.push(() => controls.dispose());
      const view = camera.clone();

      const resize = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = view.aspect = width / height;
        camera.updateProjectionMatrix();
        view.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);
      cleanups.push(() => window.removeEventListener('resize', resize));

      // Pulls `eye` back toward the target until it is inside EYE_BOUNDS.
      const keepInside = (eye: THREE.Vector3) => {
        let keep = 1;
        for (const axis of ['x', 'y', 'z'] as const) {
          const from = target[axis];
          const low = EYE_BOUNDS.min[axis];
          const high = EYE_BOUNDS.max[axis];
          if (eye[axis] < low) keep = Math.min(keep, (low - from) / (eye[axis] - from));
          else if (eye[axis] > high) keep = Math.min(keep, (high - from) / (eye[axis] - from));
        }
        if (keep < 1) eye.sub(target).multiplyScalar(Math.max(0.05, keep)).add(target);
      };

      // Zoom runs from 0 (the seat) to 1 (in front of the Cabin Screen).
      let zoomed = false;
      let zoom = 0;
      let zoomFrom = 0;
      let zoomStart = 0;
      const near = new THREE.Vector3();
      let reported: CabinView | null = null;
      const report = () => {
        if (reported?.zoomed === zoomed && reported.tab === tab) return;
        reported = { zoomed, tab };
        events.onView(reported);
      };
      const setZoomed = (next: boolean) => {
        if (zoomed === next) return;
        zoomed = next;
        zoomFrom = zoom;
        zoomStart = performance.now();
        controls.enabled = !next;
        controls.cursorStyle = next ? 'auto' : 'grab';
        report();
      };
      zoomOut = () => setZoomed(false);
      show.tab = () => {
        paint();
        if (!ready) {
          zoomAsked = true;
          return;
        }
        setZoomed(true);
        report();
      };

      const escape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setZoomed(false);
      };
      window.addEventListener('keydown', escape);
      cleanups.push(() => window.removeEventListener('keydown', escape));

      const ray = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      // Where the pointer is: its press point, and the zone of the Cabin
      // Screen under it.
      const pointAt = (event: PointerEvent): { press: PressPoint; zone: Zone | null } => {
        const bounds = canvas.getBoundingClientRect();
        pointer.set(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        ray.setFromCamera(pointer, view);
        const uv = ray.intersectObject(screenMesh, false)[0]?.uv;
        return {
          press: { x: event.clientX, y: event.clientY, at: performance.now(), onScreen: uv !== undefined },
          zone: uv ? zoneAt(zones, uv.x * SCREEN_WIDTH, uv.y * SCREEN_HEIGHT) : null,
        };
      };
      const setHover = (key: string | null) => {
        if (hover === key) return;
        hover = key;
        paint();
      };
      let pressed: PressPoint | null = null;
      const down = (event: PointerEvent) => {
        pressed = event.isPrimary && event.button === 0 ? pointAt(event).press : null;
      };
      const up = (event: PointerEvent) => {
        const start = pressed;
        pressed = null;
        if (!start) return;
        const { press, zone } = pointAt(event);
        if (!isTap({ start, end: press })) return;
        if (zone?.kind === 'item') {
          if (zone.href.startsWith('/')) events.onNavigate(zone.href);
          else window.open(zone.href, '_blank', 'noopener,noreferrer');
          return;
        }
        if (zone?.kind === 'tab') tab = zone.tab;
        show.tab();
      };
      const cancel = () => {
        pressed = null;
      };
      const move = (event: PointerEvent) => {
        if (pressed) return;
        const { press, zone } = pointAt(event);
        setHover(zone?.key ?? null);
        canvas.style.cursor = zone || (press.onScreen && !zoomed) ? 'pointer' : zoomed ? 'auto' : 'grab';
      };
      const leave = () => setHover(null);
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', cancel);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerleave', leave);

      // A frame's cost is timed with the GPU made to finish it.
      const gl = renderer.getContext();
      const pixel = new Uint8Array(4);
      let testing = true;
      let skip = TEST_WARM_FRAMES;
      let costs: number[] = [];
      let count = 0;
      const stepDown = () => {
        step++;
        renderer.setPixelRatio(pixelRatios[step]);
        costs = [];
        skip = TEST_WARM_FRAMES;
      };
      // Returns false when the frame test failed and the Cabin stopped.
      const timed = (cost: number) => {
        if (skip > 0) {
          skip--;
          return true;
        }
        costs.push(cost);
        if (costs.length < (testing ? TEST_FRAMES : GOVERNOR_FRAMES)) return true;
        const typical = median(costs);
        costs = [];
        const last = step === pixelRatios.length - 1;
        if (typical > STEP_DOWN_MS && !last) {
          stepDown();
        } else if (testing && typical > FRAME_BUDGET_MS) {
          disposed = true;
          stop();
          events.onFrameTestFailed();
          return false;
        } else if (testing) {
          testing = false;
          ready = true;
          events.onReady();
          if (zoomAsked) show.tab();
        }
        return true;
      };

      const sway = new THREE.Vector3();
      let last = performance.now();
      const draw = (now: number) => {
        const began = performance.now();
        const elapsed = Math.min(0.05, (now - last) / 1000);
        last = now;
        street.advance(speedAt(now) * elapsed);

        controls.update();
        view.position.copy(camera.position);
        keepInside(view.position);

        const progress = Math.min(1, (now - zoomStart) / ZOOM_MS);
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        zoom = zoomFrom + ((zoomed ? 1 : 0) - zoomFrom) * eased;
        if (zoom > 0) {
          const tangent = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
          const reach = Math.max(
            screenSize.y / (2 * tangent * ZOOM_FILL_HEIGHT),
            screenSize.x / (2 * tangent * view.aspect * ZOOM_FILL_WIDTH),
          );
          near.copy(target);
          near.z += Math.min(reach, orbit.radius);
          view.position.lerp(near, zoom);
        }
        view.lookAt(target);
        sway.set(
          Math.sin(now / 1300) * 0.004,
          Math.sin(now / 470) * 0.002 + Math.sin(now / 1900) * 0.002,
          0,
        );
        view.position.add(sway);
        view.updateMatrixWorld();
        street.sky.position.copy(view.position);

        renderer.clear();
        renderer.render(street.scene, view);
        renderer.render(cabinScene, view);

        count++;
        if (testing || count % GOVERNOR_EVERY === 0) {
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          if (!timed(performance.now() - began)) return;
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);

      probe = () => ({
        gap: view.position.distanceTo(camera.position),
        distance: view.position.distanceTo(target),
        azimuth: controls.getAzimuthalAngle(),
        polar: controls.getPolarAngle(),
        zoomed,
        pixelRatio: renderer.getPixelRatio(),
        tab,
        lighting: drawnLighting,
        paintCost,
        zones: zones.map((zone) => {
          const bounds = canvas.getBoundingClientRect();
          const size = screenBox.getSize(new THREE.Vector3());
          const at = new THREE.Vector3(
            screenBox.min.x + (((zone.x0 + zone.x1) / 2) / SCREEN_WIDTH) * size.x,
            screenBox.max.y - (((zone.y0 + zone.y1) / 2) / SCREEN_HEIGHT) * size.y,
            (screenBox.min.z + screenBox.max.z) / 2,
          ).project(view);
          return {
            key: zone.key,
            x: bounds.left + ((at.x + 1) / 2) * bounds.width,
            y: bounds.top + ((1 - at.y) / 2) * bounds.height,
          };
        }),
      });
    }
  }

  return {
    zoomOut: () => zoomOut(),
    showTab: (next) => {
      tab = next;
      zoomAsked = true;
      show.tab();
    },
    setLighting: (next) => {
      lighting = next;
      show.lighting();
    },
    setLanguage: (next) => {
      language = next;
      show.language();
    },
    probe: () => probe(),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      stop();
    },
  };
}
