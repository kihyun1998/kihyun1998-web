import { describe, expect, it } from 'vitest';
import {
  AVIF_KEY,
  AVIF_PROBE,
  CHOICE_KEY,
  COVER_ATTRIBUTE,
  COVER_GAVE_UP_EVENT,
  COVER_LIMIT_MS,
  FRAME_TEST_KEY,
  avifFor,
  coverScript,
  coverState,
  liftCover,
} from './cabin-cover';
import { homeFor, type StoredHome } from './cabin-rules';

class FakeHtml {
  attributes = new Map<string, string>();
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
}

class ManualClock {
  now: number;
  private timers = new Map<number, { at: number; fire: () => void }>();
  private next = 1;
  constructor(now: number) {
    this.now = now;
  }
  setTimeout = (fire: () => void, delay: number) => {
    const id = this.next++;
    this.timers.set(id, { at: this.now + delay, fire });
    return id;
  };
  clearTimeout = (id: number) => {
    this.timers.delete(id);
  };
  get pending() {
    return this.timers.size;
  }
  advance(ms: number) {
    const until = this.now + ms;
    for (;;) {
      const due = [...this.timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.now = due[1].at;
      due[1].fire();
    }
    this.now = until;
  }
}

type Page = {
  path?: string;
  storage?: Record<string, string> | 'throws';
  webgl?: boolean | 'throws';
  reducedMotion?: boolean;
  hidden?: boolean;
  now?: number;
};

class FakeProbeImage {
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  answer(decodes: boolean) {
    if (decodes) this.onload?.();
    else this.onerror?.();
  }
}

function runHeadScript({
  path = '/',
  storage = {},
  webgl = true,
  reducedMotion = false,
  hidden = false,
  now = 20,
}: Page) {
  const root = new FakeHtml();
  const clock = new ManualClock(now);
  const dispatched: string[] = [];
  const listeners = new Set<() => void>();
  const contexts = { made: 0 };
  const images: FakeProbeImage[] = [];
  const Image = function () {
    const image = new FakeProbeImage();
    images.push(image);
    return image;
  };
  const localStorage = {
    getItem(key: string) {
      if (storage === 'throws') throw new Error('SecurityError');
      return storage[key] ?? null;
    },
  };
  const document = {
    hidden,
    addEventListener: (type: string, listener: () => void) => {
      if (type === 'visibilitychange') listeners.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => {
      if (type === 'visibilitychange') listeners.delete(listener);
    },
    documentElement: root,
    createElement: () => ({
      getContext: (kind: string) => {
        contexts.made++;
        if (webgl === 'throws') throw new Error('no canvas');
        return kind === 'webgl2' && webgl ? {} : null;
      },
    }),
  };
  const window = {
    matchMedia: (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion,
    }),
    dispatchEvent: (event: Event) => dispatched.push(event.type),
  };
  new Function(
    'window',
    'document',
    'localStorage',
    'location',
    'performance',
    'setTimeout',
    'clearTimeout',
    'Image',
    coverScript,
  )(
    window,
    document,
    localStorage,
    { pathname: path },
    { now: () => clock.now },
    clock.setTimeout,
    clock.clearTimeout,
    Image,
  );
  const setHidden = (value: boolean) => {
    document.hidden = value;
    for (const listener of [...listeners]) listener();
  };
  return { root, clock, setHidden, dispatched, listeners, contexts, images };
}

const covered = (page: Page) => runHeadScript(page).root.getAttribute(COVER_ATTRIBUTE) === 'cover';

describe('coverScript', () => {
  it('covers the home page for a first-time visitor with WebGL 2', () => {
    expect(covered({})).toBe(true);
  });

  it('leaves the page uncovered for a stored Reading Home choice', () => {
    expect(covered({ storage: { [CHOICE_KEY]: 'reading-home' } })).toBe(false);
  });

  it('leaves the page uncovered for reduced motion with no choice', () => {
    expect(covered({ reducedMotion: true })).toBe(false);
  });

  it('leaves the page uncovered without WebGL 2', () => {
    expect(covered({ webgl: false })).toBe(false);
    expect(covered({ webgl: 'throws' })).toBe(false);
  });

  it('creates no WebGL context when the stored state alone rules the Cabin out', () => {
    expect(runHeadScript({ storage: { [CHOICE_KEY]: 'reading-home' } }).contexts.made).toBe(0);
    expect(runHeadScript({ storage: { [FRAME_TEST_KEY]: 'failed' } }).contexts.made).toBe(0);
    expect(runHeadScript({ reducedMotion: true }).contexts.made).toBe(0);
    expect(runHeadScript({}).contexts.made).toBe(1);
    expect(runHeadScript({ reducedMotion: true, storage: { [CHOICE_KEY]: 'cabin' } }).contexts.made).toBe(1);
  });

  it('covers when localStorage throws, as nothing stored', () => {
    expect(covered({ storage: 'throws' })).toBe(true);
  });

  it('covers only the home page', () => {
    expect(covered({ path: '/projects' })).toBe(false);
    expect(covered({ path: '/open-source' })).toBe(false);
  });

  it('covers exactly when homeFor gives the Cabin, for every stored state and probe answer', () => {
    const choices = [null, 'cabin', 'reading-home', 'something-else'];
    const frameTests = [null, 'failed', 'passed'];
    const avifs = [null, 'unsupported', 'something-else'];
    const answers = [null, true, false];
    let cabins = 0;
    let runs = 0;
    for (const webgl of [true, false])
      for (const reducedMotion of [true, false])
        for (const choice of choices)
          for (const frameTest of frameTests)
            for (const avif of avifs)
              for (const answer of answers) {
                const storage: Record<string, string> = {};
                if (choice !== null) storage[CHOICE_KEY] = choice;
                if (frameTest !== null) storage[FRAME_TEST_KEY] = frameTest;
                if (avif !== null) storage[AVIF_KEY] = avif;
                const home = homeFor({
                  webgl,
                  avif: avifFor(avif, answer) !== false,
                  reducedMotion,
                  frameTestFailed: frameTest === 'failed',
                  choice: choice === 'cabin' || choice === 'reading-home' ? (choice as StoredHome) : null,
                });
                runs++;
                if (home === 'cabin') cabins++;
                const page = runHeadScript({ webgl, reducedMotion, storage });
                if (answer !== null) for (const image of page.images) image.answer(answer);
                expect(
                  page.root.getAttribute(COVER_ATTRIBUTE) === 'cover',
                  JSON.stringify({ webgl, reducedMotion, storage, answer }),
                ).toBe(home === 'cabin');
              }
    expect(cabins, 'some combination covers').toBeGreaterThan(0);
    expect(cabins, 'some combination does not cover').toBeLessThan(runs);
  });

  it('covers at once while the AVIF probe has not answered, and probes the probe image once', () => {
    const { root, images } = runHeadScript({});
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
    expect(images.map((image) => image.src)).toEqual([AVIF_PROBE]);
  });

  it('lifts the cover when the AVIF probe fails, and keeps it when the probe decodes', () => {
    const failed = runHeadScript({});
    failed.images[0].answer(false);
    expect(failed.root.getAttribute(COVER_ATTRIBUTE)).toBe(null);
    expect(failed.dispatched).toEqual([]);
    failed.clock.advance(COVER_LIMIT_MS);
    expect(failed.root.getAttribute(COVER_ATTRIBUTE)).toBe(null);
    expect(failed.dispatched).toEqual([]);

    const decoded = runHeadScript({});
    decoded.images[0].answer(true);
    expect(decoded.root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
  });

  it('keeps a give-up when the AVIF probe fails after it', () => {
    const { root, clock, images } = runHeadScript({});
    clock.advance(COVER_LIMIT_MS);
    images[0].answer(false);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('gave-up');
  });

  it('leaves the page uncovered, creates no WebGL context and probes nothing when AVIF is stored as unsupported', () => {
    const page = runHeadScript({ storage: { [AVIF_KEY]: 'unsupported' } });
    expect(page.root.getAttribute(COVER_ATTRIBUTE)).toBe(null);
    expect(page.contexts.made).toBe(0);
    expect(page.images).toEqual([]);
    expect(page.clock.pending).toBe(0);
  });

  it('probes nothing when it does not cover', () => {
    expect(runHeadScript({ webgl: false }).images).toEqual([]);
    expect(runHeadScript({ reducedMotion: true }).images).toEqual([]);
    expect(runHeadScript({ path: '/projects' }).images).toEqual([]);
  });

  it('gives up at the limit, counted from the start of the page load', () => {
    const { root, clock, dispatched } = runHeadScript({ now: 120 });
    clock.advance(COVER_LIMIT_MS - 121);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
    expect(dispatched).toEqual([]);
    clock.advance(1);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('gave-up');
    expect(dispatched).toEqual([COVER_GAVE_UP_EVENT]);
  });

  it('counts only the time the page is visible', () => {
    const { root, clock, setHidden, dispatched } = runHeadScript({ now: 0 });
    clock.advance(1000);
    setHidden(true);
    clock.advance(60_000);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
    setHidden(false);
    clock.advance(COVER_LIMIT_MS - 1001);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
    clock.advance(1);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('gave-up');
    expect(dispatched).toEqual([COVER_GAVE_UP_EVENT]);
  });

  it('starts counting when a page loaded hidden is first shown', () => {
    const { root, clock, setHidden } = runHeadScript({ now: 300, hidden: true });
    clock.advance(60_000);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
    setHidden(false);
    clock.advance(COVER_LIMIT_MS - 1);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
    clock.advance(1);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('gave-up');
  });

  it('stops listening once it gave up', () => {
    const { clock, listeners } = runHeadScript({});
    expect(listeners.size).toBe(1);
    clock.advance(COVER_LIMIT_MS);
    expect(listeners.size).toBe(0);
    expect(clock.pending).toBe(0);
  });

  it('does nothing at the limit once the cover was lifted', () => {
    const { root, clock, dispatched } = runHeadScript({});
    liftCover(root);
    clock.advance(COVER_LIMIT_MS);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe(null);
    expect(dispatched).toEqual([]);
  });

  it('sets no timer and no listener when it does not cover', () => {
    const { clock, listeners } = runHeadScript({ webgl: false });
    expect(clock.pending).toBe(0);
    expect(listeners.size).toBe(0);
  });
});

describe('avifFor', () => {
  const cases = [
    [null, null, null],
    [null, true, true],
    [null, false, false],
    ['unsupported', null, false],
    ['unsupported', true, false],
    ['unsupported', false, false],
    ['something-else', null, null],
    ['something-else', true, true],
    ['something-else', false, false],
  ] as const;
  it.each(cases)('stored %s, probe answer %s → %s', (stored, answer, decodes) => {
    expect(avifFor(stored, answer)).toBe(decodes);
  });
});

describe('liftCover and coverState', () => {
  it('reads the cover the head script set, and lifts it', () => {
    const { root } = runHeadScript({});
    expect(coverState(root)).toBe('cover');
    liftCover(root);
    expect(coverState(root)).toBe(null);
  });

  it('keeps a give-up when lifting', () => {
    const { root, clock } = runHeadScript({});
    clock.advance(COVER_LIMIT_MS);
    liftCover(root);
    expect(coverState(root)).toBe('gave-up');
  });

  it('reads no cover on a page the script left alone', () => {
    expect(coverState(runHeadScript({ webgl: false }).root)).toBe(null);
  });
});
