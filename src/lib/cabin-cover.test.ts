import { describe, expect, it } from 'vitest';
import {
  CHOICE_KEY,
  COVER_ATTRIBUTE,
  COVER_GAVE_UP_EVENT,
  COVER_LIMIT_MS,
  FRAME_TEST_KEY,
  coverScript,
  coverState,
  liftCover,
} from './cabin-cover';
import { homeFor, type StoredHome } from './cabin-rules';

// A stand-in for <html>: only the attribute calls the script and helpers make.
class Root {
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

// A stand-in clock: setTimeout, clearTimeout and performance.now, moved on by
// hand.
class Clock {
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

// Runs the head script against the given page and returns <html>, the clock,
// a way to change the page's visibility, and the events it dispatched.
function run({
  path = '/',
  storage = {},
  webgl = true,
  reducedMotion = false,
  hidden = false,
  now = 20,
}: Page) {
  const root = new Root();
  const clock = new Clock(now);
  const dispatched: string[] = [];
  const listeners = new Set<() => void>();
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
    coverScript,
  )(
    window,
    document,
    localStorage,
    { pathname: path },
    { now: () => clock.now },
    clock.setTimeout,
    clock.clearTimeout,
  );
  const setHidden = (value: boolean) => {
    document.hidden = value;
    for (const listener of [...listeners]) listener();
  };
  return { root, clock, setHidden, dispatched, listeners };
}

const covered = (page: Page) => run(page).root.getAttribute(COVER_ATTRIBUTE) === 'cover';

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

  it('covers when localStorage throws, as nothing stored', () => {
    expect(covered({ storage: 'throws' })).toBe(true);
  });

  it('covers only the home page', () => {
    expect(covered({ path: '/projects' })).toBe(false);
    expect(covered({ path: '/open-source' })).toBe(false);
  });

  it('covers exactly when homeFor gives the Cabin, for every stored state', () => {
    const choices = [null, 'cabin', 'reading-home', 'something-else'];
    const frameTests = [null, 'failed', 'passed'];
    let cabins = 0;
    for (const webgl of [true, false])
      for (const reducedMotion of [true, false])
        for (const choice of choices)
          for (const frameTest of frameTests) {
            const storage: Record<string, string> = {};
            if (choice !== null) storage[CHOICE_KEY] = choice;
            if (frameTest !== null) storage[FRAME_TEST_KEY] = frameTest;
            const home = homeFor({
              webgl,
              reducedMotion,
              frameTestFailed: frameTest === 'failed',
              choice: choice === 'cabin' || choice === 'reading-home' ? (choice as StoredHome) : null,
            });
            if (home === 'cabin') cabins++;
            expect(covered({ webgl, reducedMotion, storage }), JSON.stringify({ webgl, reducedMotion, storage })).toBe(
              home === 'cabin',
            );
          }
    // The window is not vacuous: both outcomes occur.
    expect(cabins).toBeGreaterThan(0);
    expect(cabins).toBeLessThan(2 * 2 * choices.length * frameTests.length);
  });

  it('gives up at the limit, counted from the start of the page load', () => {
    const { root, clock, dispatched } = run({ now: 120 });
    clock.advance(COVER_LIMIT_MS - 121);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
    expect(dispatched).toEqual([]);
    clock.advance(1);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('gave-up');
    expect(dispatched).toEqual([COVER_GAVE_UP_EVENT]);
  });

  it('counts only the time the page is visible', () => {
    const { root, clock, setHidden, dispatched } = run({ now: 0 });
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
    const { root, clock, setHidden } = run({ now: 300, hidden: true });
    clock.advance(60_000);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
    setHidden(false);
    clock.advance(COVER_LIMIT_MS - 1);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('cover');
    clock.advance(1);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe('gave-up');
  });

  it('stops listening once it gave up', () => {
    const { clock, listeners } = run({});
    expect(listeners.size).toBe(1);
    clock.advance(COVER_LIMIT_MS);
    expect(listeners.size).toBe(0);
    expect(clock.pending).toBe(0);
  });

  it('does nothing at the limit once the cover was lifted', () => {
    const { root, clock, dispatched } = run({});
    liftCover(root);
    clock.advance(COVER_LIMIT_MS);
    expect(root.getAttribute(COVER_ATTRIBUTE)).toBe(null);
    expect(dispatched).toEqual([]);
  });

  it('sets no timer and no listener when it does not cover', () => {
    const { clock, listeners } = run({ webgl: false });
    expect(clock.pending).toBe(0);
    expect(listeners.size).toBe(0);
  });
});

describe('liftCover and coverState', () => {
  it('reads the cover the head script set, and lifts it', () => {
    const { root } = run({});
    expect(coverState(root)).toBe('cover');
    liftCover(root);
    expect(coverState(root)).toBe(null);
  });

  it('keeps a give-up when lifting', () => {
    const { root, clock } = run({});
    clock.advance(COVER_LIMIT_MS);
    liftCover(root);
    expect(coverState(root)).toBe('gave-up');
  });

  it('reads no cover on a page the script left alone', () => {
    expect(coverState(run({ webgl: false }).root)).toBe(null);
  });
});
