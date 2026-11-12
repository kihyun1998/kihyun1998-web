// The Cabin's rules as plain functions of their inputs: what counts as a tap
// on the Cabin Screen, the orbit that keeps the eye inside the cabin, which
// lighting a theme means, and whether a visitor gets the Cabin or the Reading
// Home. Nothing here touches the DOM or three.js.
// See docs/adr/0011-home-is-a-cabin-over-a-reading-home.md and
// docs/map/home-room.md.

export const TAP_MAX_MOVE_PX = 5;
export const TAP_MAX_HOLD_MS = 400;

// One end of a press: where the pointer was in CSS pixels, when in
// milliseconds, and whether it was over the Cabin Screen.
export type PressPoint = { x: number; y: number; at: number; onScreen: boolean };

export type Press = { start: PressPoint; end: PressPoint };

// A press is a tap when both ends are on the Cabin Screen and it stayed within
// the move and hold limits, both inclusive.
export function isTap({ start, end }: Press): boolean {
  return (
    start.onScreen &&
    end.onScreen &&
    Math.hypot(end.x - start.x, end.y - start.y) <= TAP_MAX_MOVE_PX &&
    end.at - start.at <= TAP_MAX_HOLD_MS
  );
}

// The theme choice as stored per browser; null when the visitor never chose.
export type StoredTheme = 'light' | 'dark' | null;

export type Lighting = 'day' | 'night';

// Light is day and dark is night; with no stored choice the OS preference
// stands in for it.
export function lightingFor(stored: StoredTheme, osPrefersDark: boolean): Lighting {
  const dark = stored === null ? osPrefersDark : stored === 'dark';
  return dark ? 'night' : 'day';
}

export type Home = 'cabin' | 'reading-home';

// The home the visitor picked with the switch, as stored per browser; null
// when they never picked.
export type StoredHome = Home | null;

export type Visitor = {
  // WebGL is available in this browser.
  webgl: boolean;
  // The Cabin ran over its frame budget in its first seconds.
  frameTestFailed: boolean;
  // The visitor's device asks for reduced motion.
  reducedMotion: boolean;
  choice: StoredHome;
};

// The Reading Home when the Cabin cannot run or ran too slowly. Otherwise the
// stored choice; with none stored, the Cabin unless reduced motion is asked
// for.
export function homeFor(visitor: Visitor): Home {
  if (!visitor.webgl || visitor.frameTestFailed) return 'reading-home';
  if (visitor.choice !== null) return visitor.choice;
  return visitor.reducedMotion ? 'reading-home' : 'cabin';
}

// A position in the scene, in metres; y is up.
export type Point = { x: number; y: number; z: number };

// An axis-aligned box.
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

// The gap kept between the eye and the cabin's inner bounds, in metres.
export const ORBIT_MARGIN = 0.02;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

// An orbit around `target` whose eye stays `margin` inside `bounds`, for a
// target the eye faces from +z. The radius reaches the back wall (max z); at
// that radius the polar limits reach the ceiling and the floor, and the
// azimuth limits the side walls and the front wall (min z). Throws a
// RangeError naming the wall when the limits, fitted in that order, leave no
// room.
export function fitOrbit(bounds: Bounds, target: Point, margin = ORBIT_MARGIN): Orbit {
  const none = (wall: string) =>
    new RangeError(`The orbit around the target does not fit inside the bounds (${wall}).`);

  const radius = bounds.max.z - margin - target.z;
  if (!(radius > 0)) throw none('back wall');

  // The eye's height is target.y + radius * cos(polar).
  const highest = (bounds.max.y - margin - target.y) / radius;
  const lowest = (bounds.min.y + margin - target.y) / radius;
  if (highest < lowest || highest < -1 || lowest > 1) throw none('floor and ceiling');
  const minPolar = Math.acos(Math.min(highest, 1));
  const maxPolar = Math.acos(Math.max(lowest, -1));

  // The horizontal reach is radius * sin(polar); its extremes over the polar
  // range decide which polar angle presses the eye hardest against a wall.
  const level = minPolar <= Math.PI / 2 && maxPolar >= Math.PI / 2;
  const widest = radius * (level ? 1 : Math.max(Math.sin(minPolar), Math.sin(maxPolar)));
  const narrowest = radius * Math.min(Math.sin(minPolar), Math.sin(maxPolar));

  // Side walls: the eye's x is target.x + reach * sin(azimuth).
  const right = bounds.max.x - margin - target.x;
  const left = target.x - (bounds.min.x + margin);
  if (right < 0 || left < 0) throw none('side walls');
  const toward = (room: number) => (room >= widest ? Math.PI : Math.asin(room / widest));

  // Front wall: the eye's z is target.z + reach * cos(azimuth).
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
