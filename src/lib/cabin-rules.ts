export const TAP_MAX_MOVE_PX = 5;
export const TAP_MAX_HOLD_MS = 400;

export type PressPoint = { x: number; y: number; at: number; onScreen: boolean };

export type Press = { start: PressPoint; end: PressPoint };

export function isTap({ start, end }: Press): boolean {
  return (
    start.onScreen &&
    end.onScreen &&
    Math.hypot(end.x - start.x, end.y - start.y) <= TAP_MAX_MOVE_PX &&
    end.at - start.at <= TAP_MAX_HOLD_MS
  );
}

export type Lighting = 'day' | 'night';

export type Home = 'cabin' | 'reading-home';

export type StoredHome = Home | null;

export type Visitor = {
  webgl: boolean;
  avif: boolean;
  frameTestFailed: boolean;
  reducedMotion: boolean;
  choice: StoredHome;
};

export function homeFor(visitor: Visitor): Home {
  if (!visitor.webgl || !visitor.avif || visitor.frameTestFailed) return 'reading-home';
  if (visitor.choice !== null) return visitor.choice;
  return visitor.reducedMotion ? 'reading-home' : 'cabin';
}

export type Point = { x: number; y: number; z: number };

export type Bounds = { min: Point; max: Point };

// An orbit in OrbitControls' terms: the eye's fixed distance from the target
// and the range of its azimuth (around the y axis, 0 toward +z) and polar
// angle (from the y axis), in radians.
export type Orbit = {
  radius: number;
  minAzimuth: number;
  maxAzimuth: number;
  minPolar: number;
  maxPolar: number;
};

export const ORBIT_MARGIN = 0.02;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

export function fitOrbit(bounds: Bounds, target: Point, margin = ORBIT_MARGIN): Orbit {
  const none = (wall: string) =>
    new RangeError(`The orbit around the target does not fit inside the bounds (${wall}).`);

  const radius = bounds.max.z - margin - target.z;
  if (!(radius > 0)) throw none('back wall');

  const highest = (bounds.max.y - margin - target.y) / radius;
  const lowest = (bounds.min.y + margin - target.y) / radius;
  if (highest < lowest || highest < -1 || lowest > 1) throw none('floor and ceiling');
  const minPolar = Math.acos(Math.min(highest, 1));
  const maxPolar = Math.acos(Math.max(lowest, -1));

  const level = minPolar <= Math.PI / 2 && maxPolar >= Math.PI / 2;
  const widest = radius * (level ? 1 : Math.max(Math.sin(minPolar), Math.sin(maxPolar)));
  const narrowest = radius * Math.min(Math.sin(minPolar), Math.sin(maxPolar));

  const right = bounds.max.x - margin - target.x;
  const left = target.x - (bounds.min.x + margin);
  if (right < 0 || left < 0) throw none('side walls');
  const toward = (room: number) => (room >= widest ? Math.PI : Math.asin(room / widest));

  const front = bounds.min.z + margin - target.z;
  if (front > narrowest) throw none('front wall');
  const pastFront = Math.acos(clamp(front / (front > 0 ? narrowest : widest), -1, 1));

  return {
    radius,
    minAzimuth: -Math.min(toward(left), pastFront),
    maxAzimuth: Math.min(toward(right), pastFront),
    minPolar,
    maxPolar,
  };
}

export function orbitAnglesAt(
  target: Point,
  radius: number,
  at: { x: number; y: number },
): { azimuth: number; polar: number } {
  const up = (at.y - target.y) / radius;
  if (!(Math.abs(up) <= 1)) throw new RangeError(`The orbit does not reach the height ${at.y}.`);
  const polar = Math.acos(up);
  const across = (at.x - target.x) / (radius * Math.sin(polar));
  if (!(Math.abs(across) <= 1)) throw new RangeError(`The orbit does not reach x ${at.x} at the height ${at.y}.`);
  return { azimuth: Math.asin(across), polar };
}

export function isNear(bounds: Bounds, point: Point, reach: number): boolean {
  const gap = (axis: keyof Point) =>
    Math.max(bounds.min[axis] - point[axis], 0, point[axis] - bounds.max[axis]);
  return Math.hypot(gap('x'), gap('y'), gap('z')) < reach;
}

export function fovFor(aspect: number, fov: number, minAcross: number): number {
  const half = (degrees: number) => Math.tan((degrees * Math.PI) / 360);
  const needed = (2 * Math.atan(half(minAcross) / aspect) * 180) / Math.PI;
  return Math.max(fov, needed);
}

export function lightmapColorSpace(encoding: string | undefined): 'srgb' {
  if (encoding === 'srgb-thrice') return 'srgb';
  throw new Error(`The Cabin does not know the lightmap encoding ${JSON.stringify(encoding)}.`);
}

export type LightmapTag = Lighting | 'ambient';

export function lightmapsFor(lighting: Lighting): LightmapTag[] {
  return lighting === 'night' ? ['night', 'ambient'] : [lighting];
}

export type SurfaceTextureEntry = { tile: number; mean: number };

export function surfaceTexture({ tile, mean }: SurfaceTextureEntry): { repeat: number; colorGain: number } {
  if (!(tile > 0)) throw new RangeError(`A Cabin surface texture's tile must be positive, not ${tile}.`);
  if (!(mean > 0 && mean <= 1)) throw new RangeError(`A Cabin surface texture's mean must be in (0, 1], not ${mean}.`);
  return { repeat: 1 / tile, colorGain: 1 / mean };
}
