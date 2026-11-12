import { describe, expect, it } from 'vitest';
import {
  ORBIT_MARGIN,
  fitOrbit,
  homeFor,
  isTap,
  lightingFor,
  type Bounds,
  type Point,
  type Press,
} from './cabin-rules';

// A quick, still press that starts and ends on the Cabin Screen.
const press: Press = {
  start: { x: 100, y: 100, at: 1000, onScreen: true },
  end: { x: 100, y: 100, at: 1100, onScreen: true },
};

const ending = (end: Partial<Press['end']>): Press => ({
  start: press.start,
  end: { ...press.end, ...end },
});

describe('isTap', () => {
  it('counts a quick, still press on the Cabin Screen as a tap', () => {
    expect(isTap(press)).toBe(true);
  });

  it('rejects a drag that ends on the Cabin Screen but started off it', () => {
    expect(isTap({ ...press, start: { ...press.start, onScreen: false } })).toBe(
      false,
    );
  });

  it('rejects a press that starts on the Cabin Screen and ends off it', () => {
    expect(isTap(ending({ onScreen: false }))).toBe(false);
  });

  it('rejects a press that is on the Cabin Screen at neither end', () => {
    expect(
      isTap({
        start: { ...press.start, onScreen: false },
        end: { ...press.end, onScreen: false },
      }),
    ).toBe(false);
  });

  it('allows the pointer to move exactly 5 px', () => {
    // A 3-4-5 triangle: 5 px in a straight line, on neither axis alone.
    expect(isTap(ending({ x: 103, y: 104 }))).toBe(true);
  });

  it('rejects a press that moves more than 5 px sideways', () => {
    expect(isTap(ending({ x: 105.1 }))).toBe(false);
  });

  it('rejects a press that moves more than 5 px upward', () => {
    expect(isTap(ending({ y: 94.9 }))).toBe(false);
  });

  it('rejects a press that moves more than 5 px along a diagonal', () => {
    // 4 px on each axis is 5.66 px in a straight line.
    expect(isTap(ending({ x: 104, y: 104 }))).toBe(false);
  });

  it('allows a press held exactly 400 ms', () => {
    expect(isTap(ending({ at: 1400 }))).toBe(true);
  });

  it('rejects a press held longer than 400 ms', () => {
    expect(isTap(ending({ at: 1401 }))).toBe(false);
  });
});

describe('lightingFor', () => {
  it('lights the cabin for day when the visitor chose the light theme', () => {
    expect(lightingFor('light', false)).toBe('day');
  });

  it('lights the cabin for night when the visitor chose the dark theme', () => {
    expect(lightingFor('dark', true)).toBe('night');
  });

  it('lets a stored choice win over the OS preference', () => {
    expect(lightingFor('light', true)).toBe('day');
    expect(lightingFor('dark', false)).toBe('night');
  });

  it('follows the OS preference when no choice is stored', () => {
    expect(lightingFor(null, true)).toBe('night');
    expect(lightingFor(null, false)).toBe('day');
  });
});

describe('homeFor', () => {
  // Every combination of the four inputs, written out: the Cabin is shown in
  // exactly one of the sixteen.
  // webgl, frameTestFailed, reducedMotion, choseReadingHome → home
  const cases = [
    [true, false, false, false, 'cabin'],
    [true, false, false, true, 'reading-home'],
    [true, false, true, false, 'reading-home'],
    [true, false, true, true, 'reading-home'],
    [true, true, false, false, 'reading-home'],
    [true, true, false, true, 'reading-home'],
    [true, true, true, false, 'reading-home'],
    [true, true, true, true, 'reading-home'],
    [false, false, false, false, 'reading-home'],
    [false, false, false, true, 'reading-home'],
    [false, false, true, false, 'reading-home'],
    [false, false, true, true, 'reading-home'],
    [false, true, false, false, 'reading-home'],
    [false, true, false, true, 'reading-home'],
    [false, true, true, false, 'reading-home'],
    [false, true, true, true, 'reading-home'],
  ] as const;

  it.each(cases)(
    'webgl %s, frame test failed %s, reduced motion %s, chose Reading Home %s → %s',
    (webgl, frameTestFailed, reducedMotion, choseReadingHome, home) => {
      expect(homeFor({ webgl, frameTestFailed, reducedMotion, choseReadingHome })).toBe(home);
    },
  );
});

describe('fitOrbit', () => {
  // The prototype cabin's inner box and the Cabin Screen's centre, in metres.
  const cabin: Bounds = {
    min: { x: -0.61, y: 0.82, z: -0.6 },
    max: { x: 0.61, y: 1.26, z: 0.3 },
  };
  const screen: Point = { x: 0, y: 0.84, z: -0.945 };
  const offCentre: Point = { x: 0.2, y: 1.0, z: -0.945 };
  const underFloor: Point = { x: 0, y: 0.5, z: -0.945 };
  const inside: Point = { x: 0, y: 1.0, z: -0.3 };
  // Side walls too far away to matter.
  const wideCabin: Bounds = {
    min: { ...cabin.min, x: -3 },
    max: { ...cabin.max, x: 3 },
  };
  // Floor, ceiling and front wall further away than the eye can reach.
  const hall: Bounds = {
    min: { x: cabin.min.x, y: -5, z: -3 },
    max: { x: cabin.max.x, y: 5, z: cabin.max.z },
  };
  const fixtures = [
    { name: 'the screen', target: screen, bounds: cabin },
    { name: 'an off-centre target', target: offCentre, bounds: cabin },
    { name: 'a target under the floor', target: underFloor, bounds: cabin },
    { name: 'the screen of a wide cabin', target: screen, bounds: wideCabin },
    { name: 'a target inside the cabin', target: inside, bounds: cabin },
    { name: 'a target in a hall', target: inside, bounds: hall },
  ];

  // Where three.js puts the eye for these angles
  // (Vector3.setFromSphericalCoords).
  const eyeAt = (target: Point, radius: number, azimuth: number, polar: number): Point => ({
    x: target.x + radius * Math.sin(polar) * Math.sin(azimuth),
    y: target.y + radius * Math.cos(polar),
    z: target.z + radius * Math.sin(polar) * Math.cos(azimuth),
  });

  // Inside the bounds by at least the margin, less rounding.
  const expectInside = (eye: Point, bounds: Bounds, margin = ORBIT_MARGIN) => {
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(eye[axis]).toBeGreaterThanOrEqual(bounds.min[axis] + margin - 1e-9);
      expect(eye[axis]).toBeLessThanOrEqual(bounds.max[axis] - margin + 1e-9);
    }
  };

  const corners = [
    { corner: 'min azimuth, min polar', azimuth: 'minAzimuth', polar: 'minPolar' },
    { corner: 'min azimuth, max polar', azimuth: 'minAzimuth', polar: 'maxPolar' },
    { corner: 'max azimuth, min polar', azimuth: 'maxAzimuth', polar: 'minPolar' },
    { corner: 'max azimuth, max polar', azimuth: 'maxAzimuth', polar: 'maxPolar' },
  ] as const;

  describe.each(fixtures)('around $name', ({ target, bounds }) => {
    it.each(corners)('keeps the eye inside at $corner', ({ azimuth, polar }) => {
      const orbit = fitOrbit(bounds, target);

      expectInside(eyeAt(target, orbit.radius, orbit[azimuth], orbit[polar]), bounds);
    });
  });

  // The eye is furthest back and furthest sideways level with the target,
  // which can lie between the polar limits rather than at a corner.
  it.each(fixtures)(
    'keeps the eye inside everywhere between the limits around $name',
    ({ target, bounds }) => {
      const orbit = fitOrbit(bounds, target);
      const steps = 24;

      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps; j++) {
          const azimuth =
            orbit.minAzimuth + ((orbit.maxAzimuth - orbit.minAzimuth) * i) / steps;
          const polar = orbit.minPolar + ((orbit.maxPolar - orbit.minPolar) * j) / steps;
          expectInside(eyeAt(target, orbit.radius, azimuth, polar), bounds);
        }
      }
    },
  );

  it('fits the same orbit every time', () => {
    expect(fitOrbit(cabin, screen)).toEqual(fitOrbit(cabin, screen));
  });

  // Hand-computed from the box with the default 0.02 m margin: the radius
  // reaches the back wall, the polar limits the ceiling and the floor, the
  // azimuth limits the side walls.
  it('uses the room the cabin has around the screen', () => {
    const orbit = fitOrbit(cabin, screen);

    expect(orbit.radius).toBeCloseTo(1.225, 6);
    expect(orbit.minPolar).toBeCloseTo(1.238166, 5);
    expect(orbit.maxPolar).toBeCloseTo(Math.PI / 2, 5);
    expect(orbit.maxAzimuth).toBeCloseTo(0.502517, 5);
    expect(orbit.minAzimuth).toBeCloseTo(-0.502517, 5);
  });

  it('turns further toward the far wall when the target is off-centre', () => {
    const orbit = fitOrbit(cabin, offCentre);

    expect(orbit.minPolar).toBeCloseTo(1.373602, 5);
    expect(orbit.maxPolar).toBeCloseTo(1.701783, 5);
    expect(orbit.maxAzimuth).toBeCloseTo(0.324007, 5);
    expect(orbit.minAzimuth).toBeCloseTo(-0.700890, 5);
  });

  // With the whole polar range above level, the eye swings widest at the
  // lowest polar limit, and that is where the side walls are met.
  it('fits the side walls where the eye swings widest', () => {
    const orbit = fitOrbit(cabin, underFloor);

    expect(orbit.minPolar).toBeCloseTo(0.922183, 5);
    expect(orbit.maxPolar).toBeCloseTo(1.289552, 5);
    expect(orbit.maxAzimuth).toBeCloseTo(0.525135, 5);
    expect(orbit.minAzimuth).toBeCloseTo(-0.525135, 5);
  });

  it('stops the eye passing the front wall when the side walls are far', () => {
    const orbit = fitOrbit(wideCabin, screen);

    expect(orbit.maxAzimuth).toBeCloseTo(1.250088, 5);
    expect(orbit.minAzimuth).toBeCloseTo(-1.250088, 5);
  });

  it('turns past side-on around a target inside the cabin, up to the front wall', () => {
    const orbit = fitOrbit(cabin, inside);

    expect(orbit.radius).toBeCloseTo(0.58, 6);
    expect(orbit.maxAzimuth).toBeCloseTo(2.074598, 5);
    expect(orbit.minAzimuth).toBeCloseTo(-2.074598, 5);
  });

  it('lets the eye turn all the way where no wall is within reach', () => {
    const orbit = fitOrbit(hall, inside);

    expect(orbit.minPolar).toBe(0);
    expect(orbit.maxPolar).toBeCloseTo(Math.PI, 10);
    expect(orbit.maxAzimuth).toBeCloseTo(Math.PI, 10);
    expect(orbit.minAzimuth).toBeCloseTo(-Math.PI, 10);
  });

  it('keeps the eye a wider margin from the walls when asked', () => {
    const margin = 0.1;
    const orbit = fitOrbit(cabin, screen, margin);

    expect(orbit.radius).toBeCloseTo(1.145, 6);
    for (const { azimuth, polar } of corners) {
      expectInside(eyeAt(screen, orbit.radius, orbit[azimuth], orbit[polar]), cabin, margin);
    }
  });

  // Each refusal names the wall the fit ran out of room at.
  it.each([
    // Every eye position facing the target is outside.
    { name: 'behind the back wall', target: { x: 0, y: 1, z: 0.5 }, wall: /back wall/ },
    { name: 'right of the cabin', target: { x: 0.9, y: 1, z: -0.945 }, wall: /side walls/ },
    { name: 'left of the cabin', target: { x: -0.9, y: 1, z: -0.945 }, wall: /side walls/ },
    // Further from the ceiling, or the floor, than the radius reaches.
    { name: 'far above the ceiling', target: { x: 0, y: 3, z: -0.945 }, wall: /floor and ceiling/ },
    { name: 'far under the floor', target: { x: 0, y: -1, z: -0.945 }, wall: /floor and ceiling/ },
    // The eye, raised under the ceiling, falls short of the front wall.
    { name: 'too low for the front wall', target: { x: 0, y: 0.05, z: -0.945 }, wall: /front/ },
  ])('refuses a target $name', ({ target, wall }) => {
    expect(() => fitOrbit(cabin, target)).toThrow(RangeError);
    expect(() => fitOrbit(cabin, target)).toThrow(wall);
  });

  it('refuses a target on the back wall, where the radius would be nothing', () => {
    expect(() => fitOrbit(cabin, { x: 0, y: 1, z: 0.3 }, 0)).toThrow(/back wall/);
  });

  it('refuses a cabin too low to hold the margin under the ceiling and over the floor', () => {
    const crawlSpace: Bounds = {
      min: { ...cabin.min, y: 1.0 },
      max: { ...cabin.max, y: 1.03 },
    };

    const target = { x: 0, y: 1.01, z: -0.945 };

    expect(() => fitOrbit(crawlSpace, target)).toThrow(/floor and ceiling/);
  });
});
