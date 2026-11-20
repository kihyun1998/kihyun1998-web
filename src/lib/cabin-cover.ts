import { homeFor } from './cabin-rules';

export const CHOICE_KEY = 'home';
export const FRAME_TEST_KEY = 'cabin-frame-test';
export const AVIF_KEY = 'cabin-avif';

export const AVIF_PROBE =
  'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAASttZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAANGlsb2MAAAAAREAAAgABAAAAAAFPAAEAAAAAAAAAFwACAAAAAAFmAAEAAAAAAAAAQAAAADhpaW5mAAAAAAACAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAFWluZmUCAAABAAIAAEV4aWYAAAAAamlwcnAAAABLaXBjbwAAAAxhdjFDgQAMAAAAABNjb2xybmNseAABAA0AAYAAAAAUaXNwZQAAAAAAAAABAAAAAQAAABBwaXhpAAAAAAMICAgAAAAXaXBtYQAAAAAAAAABAAEEgQIDBAAAABppcmVmAAAAAAAAAA5jZHNjAAIAAQABAAAAX21kYXQSAAoIGAAGCAhoDCAyCRgACiiihAAFSAAAAAZFeGlmAABNTQAqAAAAGAAAAEgAAAABAAAASAAAAAEAAgEaAAUAAAABAAAACAEbAAUAAAABAAAAEAAAAAA=';

export const COVER_ATTRIBUTE = 'data-cabin';
export const COVER_GAVE_UP_EVENT = 'cabin-cover-gave-up';

export const COVER_LIMIT_MS = 5000;

export type CoverState = 'cover' | 'gave-up' | null;

type Root = Pick<Element, 'getAttribute' | 'setAttribute' | 'removeAttribute'>;

export function coverState(root: Root): CoverState {
  const state = root.getAttribute(COVER_ATTRIBUTE);
  return state === 'cover' || state === 'gave-up' ? state : null;
}

export function liftCover(root: Root): void {
  if (coverState(root) === 'cover') root.removeAttribute(COVER_ATTRIBUTE);
}

export function avifFor(stored: string | null, answer: boolean | null): boolean | null {
  return stored === 'unsupported' ? false : answer;
}

type ProbeImage = { src: string; onload: unknown; onerror: unknown };

export function probeAvif(image: ProbeImage, src: string, done: (decodes: boolean) => void): void {
  image.onload = function () {
    done(true);
  };
  image.onerror = function () {
    done(false);
  };
  image.src = src;
}

type VisibleDocument = Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;

function afterVisibleTime(doc: VisibleDocument, limit: number, expire: () => void) {
  let left = limit;
  let started = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  function change() {
    if (doc.hidden) {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      left -= performance.now() - started;
    } else if (timer === null) {
      started = performance.now();
      timer = setTimeout(function () {
        doc.removeEventListener('visibilitychange', change);
        expire();
      }, Math.max(0, left));
    }
  }
  doc.addEventListener('visibilitychange', change);
  change();
}

export const coverScript = `
(function () {
  try {
    if (location.pathname !== '/') return;
    var read = function (key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    };
    var decide = ${homeFor.toString()};
    var choice = read(${JSON.stringify(CHOICE_KEY)});
    var visitor = {
      webgl: true,
      avif: (${avifFor.toString()})(read(${JSON.stringify(AVIF_KEY)}), null) !== false,
      frameTestFailed: read(${JSON.stringify(FRAME_TEST_KEY)}) === 'failed',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      choice: choice === 'cabin' || choice === 'reading-home' ? choice : null
    };
    if (decide(visitor) !== 'cabin') return;
    visitor.webgl = false;
    try {
      visitor.webgl = document.createElement('canvas').getContext('webgl2') !== null;
    } catch (e) {}
    if (decide(visitor) !== 'cabin') return;
    var root = document.documentElement;
    var name = ${JSON.stringify(COVER_ATTRIBUTE)};
    root.setAttribute(name, 'cover');
    (${afterVisibleTime.toString()})(
      document,
      ${COVER_LIMIT_MS} - (document.hidden ? 0 : performance.now()),
      function () {
        if (root.getAttribute(name) !== 'cover') return;
        root.setAttribute(name, 'gave-up');
        window.dispatchEvent(new Event(${JSON.stringify(COVER_GAVE_UP_EVENT)}));
      }
    );
    (${probeAvif.toString()})(new Image(), ${JSON.stringify(AVIF_PROBE)}, function (decodes) {
      if (!decodes && root.getAttribute(name) === 'cover') root.removeAttribute(name);
    });
  } catch (e) {}
})();
`;
