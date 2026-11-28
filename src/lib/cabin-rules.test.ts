import { describe, expect, it } from 'vitest';
import manifest from '../../public/cabin/manifest.json';
import {
  LAYERS,
  ORBIT_MARGIN,
  fitOrbit,
  fovFor,
  homeFor,
  isNear,
  isTap,
  lightmapColorSpace,
  lightmapsFor,
  orbitAnglesAt,
  surfaceTexture,
  type Bounds,
  type Point,
  type Press,
} from './cabin-rules';

const press: Press = {
  start: { x: 100, y: 100, at: 1000, on: 'screen' },
  end: { x: 100, y: 100, at: 1100, on: 'screen' },
};

const ending = (end: Partial<Press['end']>): Press => ({
  start: press.start,
  end: { ...press.end, ...end },
});

describe('isTap', () => {
  it('counts a quick, still press on the Cabin Screen as a tap', () => {
    expect(isTap(press)).toBe(true);
  });

  it('counts a quick, still press on a dome lens as a tap', () => {
    expect(isTap({ start: { ...press.start, on: 'dome' }, end: { ...press.end, on: 'dome' } })).toBe(true);
  });

  it('rejects a drag that ends on the Cabin Screen but started off it', () => {
    expect(isTap({ ...press, start: { ...press.start, on: null } })).toBe(false);
  });

  it('rejects a press that starts on the Cabin Screen and ends off it', () => {
    expect(isTap(ending({ on: null }))).toBe(false);
  });

  it('rejects a press that is on nothing pressable at either end', () => {
    expect(
      isTap({
        start: { ...press.start, on: null },
        end: { ...press.end, on: null },
      }),
    ).toBe(false);
  });

  it('rejects a press that starts on a dome lens and ends on the Cabin Screen', () => {
    expect(isTap({ ...press, start: { ...press.start, on: 'dome' } })).toBe(false);
  });

  it('rejects a press that starts on the Cabin Screen and ends on a dome lens', () => {
    expect(isTap(ending({ on: 'dome' }))).toBe(false);
  });

  it('allows the pointer to move exactly 5 px in a straight line, on neither axis alone', () => {
    expect(isTap(ending({ x: 103, y: 104 }))).toBe(true);
  });

  it('rejects a press that moves more than 5 px sideways', () => {
    expect(isTap(ending({ x: 105.1 }))).toBe(false);
  });

  it('rejects a press that moves more than 5 px upward', () => {
    expect(isTap(ending({ y: 94.9 }))).toBe(false);
  });

  it('rejects a press that moves 4 px on each axis, more than 5 px along the diagonal', () => {
    expect(isTap(ending({ x: 104, y: 104 }))).toBe(false);
  });

  it('allows a press held exactly 400 ms', () => {
    expect(isTap(ending({ at: 1400 }))).toBe(true);
  });

  it('rejects a press held longer than 400 ms', () => {
    expect(isTap(ending({ at: 1401 }))).toBe(false);
  });
});

describe('homeFor', () => {
  const cases = [
    [true, true, false, false, null, 'cabin'],
    [true, true, false, false, 'cabin', 'cabin'],
    [true, true, false, false, 'reading-home', 'reading-home'],
    [true, true, false, true, null, 'reading-home'],
    [true, true, false, true, 'cabin', 'cabin'],
    [true, true, false, true, 'reading-home', 'reading-home'],
    [true, true, true, false, null, 'reading-home'],
    [true, true, true, false, 'cabin', 'reading-home'],
    [true, true, true, false, 'reading-home', 'reading-home'],
    [true, true, true, true, null, 'reading-home'],
    [true, true, true, true, 'cabin', 'reading-home'],
    [true, true, true, true, 'reading-home', 'reading-home'],
    [true, false, false, false, null, 'reading-home'],
    [true, false, false, false, 'cabin', 'reading-home'],
    [true, false, false, false, 'reading-home', 'reading-home'],
    [true, false, false, true, null, 'reading-home'],
    [true, false, false, true, 'cabin', 'reading-home'],
    [true, false, false, true, 'reading-home', 'reading-home'],
    [true, false, true, false, null, 'reading-home'],
    [true, false, true, false, 'cabin', 'reading-home'],
    [true, false, true, false, 'reading-home', 'reading-home'],
    [true, false, true, true, null, 'reading-home'],
    [true, false, true, true, 'cabin', 'reading-home'],
    [true, false, true, true, 'reading-home', 'reading-home'],
    [false, true, false, false, null, 'reading-home'],
    [false, true, false, false, 'cabin', 'reading-home'],
    [false, true, false, false, 'reading-home', 'reading-home'],
    [false, true, false, true, null, 'reading-home'],
    [false, true, false, true, 'cabin', 'reading-home'],
    [false, true, false, true, 'reading-home', 'reading-home'],
    [false, true, true, false, null, 'reading-home'],
    [false, true, true, false, 'cabin', 'reading-home'],
    [false, true, true, false, 'reading-home', 'reading-home'],
    [false, true, true, true, null, 'reading-home'],
    [false, true, true, true, 'cabin', 'reading-home'],
    [false, true, true, true, 'reading-home', 'reading-home'],
    [false, false, false, false, null, 'reading-home'],
    [false, false, false, false, 'cabin', 'reading-home'],
    [false, false, false, false, 'reading-home', 'reading-home'],
    [false, false, false, true, null, 'reading-home'],
    [false, false, false, true, 'cabin', 'reading-home'],
    [false, false, false, true, 'reading-home', 'reading-home'],
    [false, false, true, false, null, 'reading-home'],
    [false, false, true, false, 'cabin', 'reading-home'],
    [false, false, true, false, 'reading-home', 'reading-home'],
    [false, false, true, true, null, 'reading-home'],
    [false, false, true, true, 'cabin', 'reading-home'],
    [false, false, true, true, 'reading-home', 'reading-home'],
  ] as const;

  it.each(cases)(
    'webgl %s, avif %s, frame test failed %s, reduced motion %s, stored choice %s → %s',
    (webgl, avif, frameTestFailed, reducedMotion, choice, home) => {
      expect(homeFor({ webgl, avif, frameTestFailed, reducedMotion, choice })).toBe(home);
    },
  );
});

// Where three.js puts the eye for these angles
// (Vector3.setFromSphericalCoords).
const eyeAt = (target: Point, radius: number, azimuth: number, polar: number): Point => ({
  x: target.x + radius * Math.sin(polar) * Math.sin(azimuth),
  y: target.y + radius * Math.cos(polar),
  z: target.z + radius * Math.sin(polar) * Math.cos(azimuth),
});

describe('fitOrbit', () => {
  const prototypeCabin: Bounds = {
    min: { x: -0.61, y: 0.82, z: -0.6 },
    max: { x: 0.61, y: 1.26, z: 0.3 },
  };
  const screen: Point = { x: 0, y: 0.84, z: -0.945 };
  const offCentre: Point = { x: 0.2, y: 1.0, z: -0.945 };
  const underFloor: Point = { x: 0, y: 0.5, z: -0.945 };
  const inside: Point = { x: 0, y: 1.0, z: -0.3 };
  const eyeBox: Bounds = {
    min: { x: -0.61, y: 0.82, z: -0.6 },
    max: { x: 0.61, y: 1.26, z: 0.07 },
  };
  const orbitCentre: Point = { x: 0, y: 1.05, z: -0.945 };
  const wideCabin: Bounds = {
    min: { ...prototypeCabin.min, x: -3 },
    max: { ...prototypeCabin.max, x: 3 },
  };
  const hall: Bounds = {
    min: { x: prototypeCabin.min.x, y: -5, z: -3 },
    max: { x: prototypeCabin.max.x, y: 5, z: prototypeCabin.max.z },
  };
  const fixtures = [
    { name: 'the screen', target: screen, bounds: prototypeCabin },
    { name: 'an off-centre target', target: offCentre, bounds: prototypeCabin },
    { name: 'a target under the floor', target: underFloor, bounds: prototypeCabin },
    { name: 'the screen of a wide cabin', target: screen, bounds: wideCabin },
    { name: 'a target inside the cabin', target: inside, bounds: prototypeCabin },
    { name: 'a target in a hall', target: inside, bounds: hall },
    { name: 'a centre above the screen', target: orbitCentre, bounds: eyeBox },
  ];

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
    expect(fitOrbit(prototypeCabin, screen)).toEqual(fitOrbit(prototypeCabin, screen));
  });

  it('uses the room the prototype cabin has around the screen, as hand-computed from its box', () => {
    const orbit = fitOrbit(prototypeCabin, screen);

    expect(orbit.radius).toBeCloseTo(1.225, 6);
    expect(orbit.minPolar).toBeCloseTo(1.238166, 5);
    expect(orbit.maxPolar).toBeCloseTo(Math.PI / 2, 5);
    expect(orbit.maxAzimuth).toBeCloseTo(0.502517, 5);
    expect(orbit.minAzimuth).toBeCloseTo(-0.502517, 5);
  });

  it('turns further toward the far wall when the target is off-centre', () => {
    const orbit = fitOrbit(prototypeCabin, offCentre);

    expect(orbit.minPolar).toBeCloseTo(1.373602, 5);
    expect(orbit.maxPolar).toBeCloseTo(1.701783, 5);
    expect(orbit.maxAzimuth).toBeCloseTo(0.324007, 5);
    expect(orbit.minAzimuth).toBeCloseTo(-0.700890, 5);
  });

  it('looks up past level around the orbit centre above the screen, as hand-computed from the eye box', () => {
    const orbit = fitOrbit(eyeBox, orbitCentre);

    expect(orbit.radius).toBeCloseTo(0.995, 6);
    expect(orbit.minPolar).toBeCloseTo(1.378662, 5);
    expect(orbit.maxPolar).toBeCloseTo(1.783451, 5);
    expect(orbit.maxAzimuth).toBeCloseTo(0.634736, 5);
    expect(orbit.minAzimuth).toBeCloseTo(-0.634736, 5);
  });

  it('fits the side walls where the eye swings widest', () => {
    const orbit = fitOrbit(prototypeCabin, underFloor);

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
    const orbit = fitOrbit(prototypeCabin, inside);

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
    const orbit = fitOrbit(prototypeCabin, screen, margin);

    expect(orbit.radius).toBeCloseTo(1.145, 6);
    for (const { azimuth, polar } of corners) {
      expectInside(eyeAt(screen, orbit.radius, orbit[azimuth], orbit[polar]), prototypeCabin, margin);
    }
  });

  it.each([
    { name: 'behind the back wall', target: { x: 0, y: 1, z: 0.5 }, wall: /back wall/ },
    { name: 'right of the cabin', target: { x: 0.9, y: 1, z: -0.945 }, wall: /side walls/ },
    { name: 'left of the cabin', target: { x: -0.9, y: 1, z: -0.945 }, wall: /side walls/ },
    { name: 'far above the ceiling', target: { x: 0, y: 3, z: -0.945 }, wall: /floor and ceiling/ },
    { name: 'far under the floor', target: { x: 0, y: -1, z: -0.945 }, wall: /floor and ceiling/ },
    { name: 'too low for the front wall', target: { x: 0, y: 0.05, z: -0.945 }, wall: /front/ },
  ])('refuses a target $name', ({ target, wall }) => {
    expect(() => fitOrbit(prototypeCabin, target)).toThrow(RangeError);
    expect(() => fitOrbit(prototypeCabin, target)).toThrow(wall);
  });

  it('refuses a target on the back wall, where the radius would be nothing', () => {
    expect(() => fitOrbit(prototypeCabin, { x: 0, y: 1, z: 0.3 }, 0)).toThrow(/back wall/);
  });

  it('refuses a cabin too low to hold the margin under the ceiling and over the floor', () => {
    const crawlSpace: Bounds = {
      min: { ...prototypeCabin.min, y: 1.0 },
      max: { ...prototypeCabin.max, y: 1.03 },
    };

    const target = { x: 0, y: 1.01, z: -0.945 };

    expect(() => fitOrbit(crawlSpace, target)).toThrow(/floor and ceiling/);
  });
});

describe('orbitAnglesAt', () => {
  const orbitCentre: Point = { x: 0, y: 1.05, z: -0.945 };

  it('finds the opening view the page carried for the eye over the left seat, as hand-computed in #46', () => {
    const { azimuth, polar } = orbitAnglesAt(orbitCentre, 0.995, { x: -0.375, y: 1.14 });

    expect(azimuth).toBeCloseTo(-0.3881, 4);
    expect(polar).toBeCloseTo(1.4802, 4);
  });

  it.each([
    { name: 'level with the centre, straight behind it', at: { x: 0, y: 1.05 } },
    { name: 'over the left seat', at: { x: -0.375, y: 1.14 } },
    { name: 'over the right seat, low', at: { x: 0.375, y: 0.86 } },
    { name: 'at the orbit top', at: { x: 0, y: 1.05 + 0.995 } },
  ])('puts the eye at the asked place, behind the centre, $name', ({ at }) => {
    const { azimuth, polar } = orbitAnglesAt(orbitCentre, 0.995, at);
    const eye = eyeAt(orbitCentre, 0.995, azimuth, polar);

    expect(eye.x).toBeCloseTo(at.x, 9);
    expect(eye.y).toBeCloseTo(at.y, 9);
    expect(eye.z).toBeGreaterThanOrEqual(orbitCentre.z);
  });

  it.each([
    { name: 'above the orbit', at: { x: 0, y: 2.1 }, reason: /reach the height 2.1/ },
    { name: 'under the orbit', at: { x: 0, y: 0 }, reason: /reach the height 0/ },
    { name: 'wider than the orbit at that height', at: { x: 0.992, y: 1.14 }, reason: /reach x 0.992/ },
  ])('refuses an eye $name', ({ at, reason }) => {
    expect(() => orbitAnglesAt(orbitCentre, 0.995, at)).toThrow(RangeError);
    expect(() => orbitAnglesAt(orbitCentre, 0.995, at)).toThrow(reason);
  });
});

describe('isNear', () => {
  const seatBack: Bounds = {
    min: { x: 0.08, y: 0.44, z: -0.12 },
    max: { x: 0.67, y: 1.21, z: 0.2 },
  };

  it('counts a point inside the box as near', () => {
    expect(isNear(seatBack, { x: 0.375, y: 1.14, z: 0 }, 0.1)).toBe(true);
  });

  it('measures from the nearest face', () => {
    expect(isNear(seatBack, { x: 0.0, y: 1.0, z: 0 }, 0.1)).toBe(true);
    expect(isNear(seatBack, { x: -0.03, y: 1.0, z: 0 }, 0.1)).toBe(false);
  });

  it('measures straight to the nearest edge or corner, not along each axis', () => {
    expect(isNear(seatBack, { x: 0.02, y: 1.27, z: 0 }, 0.1)).toBe(true);
    expect(isNear(seatBack, { x: 0.0, y: 1.29, z: 0 }, 0.1)).toBe(false);
    expect(isNear(seatBack, { x: 0.0, y: 1.29, z: 0.28 }, 0.15)).toBe(true);
  });

  it('counts a point exactly the reach away as not near', () => {
    const unit: Bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
    expect(isNear(unit, { x: 0.5, y: 0.5, z: 1.25 }, 0.25)).toBe(false);
    expect(isNear(unit, { x: 0.5, y: 0.5, z: 1.25 }, 0.2501)).toBe(true);
  });
});

describe('fovFor', () => {
  const across = (fov: number, aspect: number) =>
    (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * aspect) * 180) / Math.PI;

  it('keeps the vertical field of a wide view', () => {
    expect(fovFor(1470 / 729, 60, 40)).toBe(60);
  });

  it('widens a portrait view until it sees the least field across', () => {
    const fov = fovFor(390 / 844, 60, 40);
    expect(fov).toBeCloseTo(76.5, 1);
    expect(across(fov, 390 / 844)).toBeCloseTo(40, 6);
  });

  it('keeps the vertical field where it already sees exactly the least field across', () => {
    const aspect = Math.tan((20 * Math.PI) / 180) / Math.tan((30 * Math.PI) / 180);
    expect(fovFor(aspect, 60, 40)).toBeCloseTo(60, 9);
  });
});

describe('lightmapColorSpace', () => {
  it('uploads a lightmap stored with the sRGB curve applied three times as an sRGB texture', () => {
    expect(lightmapColorSpace('srgb-thrice')).toBe('srgb');
  });

  it('refuses an encoding it does not know, or none', () => {
    expect(() => lightmapColorSpace('srgb-twice')).toThrow(/"srgb-twice"/);
    expect(() => lightmapColorSpace('srgb')).toThrow(/"srgb"/);
    expect(() => lightmapColorSpace(undefined)).toThrow(/undefined/);
  });

  it('knows the encoding of every lightmap in the committed manifest', () => {
    const entries = Object.values(manifest.lightmaps) as { encoding?: string }[];
    expect(entries.length).toBeGreaterThanOrEqual(2);
    for (const entry of entries) expect(lightmapColorSpace(entry.encoding)).toBe('srgb');
  });
});

describe('lightmapsFor', () => {
  it('draws the day with the day lightmap alone while the dome lights are off', () => {
    expect(lightmapsFor({ lighting: 'day', domeLights: false })).toEqual({ own: 'day', layers: [] });
  });

  it('draws the night with the night lightmap and the ambient layer while the dome lights are off', () => {
    expect(lightmapsFor({ lighting: 'night', domeLights: false })).toEqual({ own: 'night', layers: ['ambient'] });
  });

  it('adds the dome layer to the day while the dome lights are on', () => {
    expect(lightmapsFor({ lighting: 'day', domeLights: true })).toEqual({ own: 'day', layers: ['dome'] });
  });

  it('adds the dome layer to the night, beside the ambient layer, while the dome lights are on', () => {
    expect(lightmapsFor({ lighting: 'night', domeLights: true })).toEqual({
      own: 'night',
      layers: ['ambient', 'dome'],
    });
  });

  it('names only layers the page knows', () => {
    for (const lighting of ['day', 'night'] as const) {
      for (const domeLights of [false, true]) {
        for (const layer of lightmapsFor({ lighting, domeLights }).layers) expect(LAYERS).toContain(layer);
      }
    }
  });

  it('reads a committed manifest that lists day, night, the ambient layer and the dome layer', () => {
    expect(Object.keys(manifest.lightmaps).sort()).toEqual(['ambient', 'day', 'dome', 'night']);
  });
});

describe('surfaceTexture', () => {
  it('repeats a tile once per its size in metres and lifts the base colour by the tile mean', () => {
    expect(surfaceTexture({ tile: 0.25, mean: 0.8 })).toEqual({ repeat: 4, colorGain: 1.25 });
    expect(surfaceTexture({ tile: 0.2, mean: 0.5 })).toEqual({ repeat: 5, colorGain: 2 });
  });

  it('accepts every surface texture in the committed manifest, and each surface names one of them', () => {
    const textures = manifest.textures as Record<string, { tile: number; mean: number }>;
    expect(Object.keys(textures).length).toBeGreaterThan(0);
    for (const entry of Object.values(textures)) expect(surfaceTexture(entry).repeat).toBeGreaterThan(0);
    for (const kind of Object.values(manifest.surfaces as Record<string, string>)) expect(textures).toHaveProperty(kind);
  });

  it('refuses a tile with no positive size, or a mean outside (0, 1]', () => {
    expect(() => surfaceTexture({ tile: 0, mean: 0.8 })).toThrow(/tile/);
    expect(() => surfaceTexture({ tile: -1, mean: 0.8 })).toThrow(/tile/);
    expect(() => surfaceTexture({ tile: 0.25, mean: 0 })).toThrow(/mean/);
    expect(() => surfaceTexture({ tile: 0.25, mean: 1.2 })).toThrow(/mean/);
  });
});
