// The loading cover drawn over the home page from its first frame when the
// Cabin will be attempted, and the storage keys the Cabin's inputs are read
// from. `coverScript` runs in <head> before paint and marks <html> with
// COVER_ATTRIBUTE; globals.css draws the cover while it reads "cover". The
// Cabin lifts it once it is ready or not coming. After COVER_LIMIT_MS of the
// page being visible the script gives up: the mark reads "gave-up" and
// COVER_GAVE_UP_EVENT is dispatched on window.
// See docs/map/home-room.md ("The Cabin on the page").

import { homeFor } from './cabin-rules';

// localStorage keys: the stored choice ('cabin' | 'reading-home') and the
// frame-test result ('failed' when it failed).
export const CHOICE_KEY = 'home';
export const FRAME_TEST_KEY = 'cabin-frame-test';

export const COVER_ATTRIBUTE = 'data-cabin';
export const COVER_GAVE_UP_EVENT = 'cabin-cover-gave-up';

// How long the page may be visible, counted from the start of the load, before
// the Cabin has to be ready.
export const COVER_LIMIT_MS = 5000;

export type CoverState = 'cover' | 'gave-up' | null;

type Root = Pick<Element, 'getAttribute' | 'setAttribute' | 'removeAttribute'>;

export function coverState(root: Root): CoverState {
  const state = root.getAttribute(COVER_ATTRIBUTE);
  return state === 'cover' || state === 'gave-up' ? state : null;
}

// Removes the cover; a give-up stays recorded.
export function liftCover(root: Root): void {
  if (coverState(root) === 'cover') root.removeAttribute(COVER_ATTRIBUTE);
}

type VisibleDocument = Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;

// Calls `expire` once `doc` has been visible for `limit` ms. Serialised into
// the head script, so it uses nothing but its arguments and browser globals.
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

// The blocking <head> script. It asks `homeFor` itself, serialised into the
// script, with what is known before paint: the two stored values and the
// reduced-motion query first, then WebGL 2, whose context is created only when
// those leave the Cabin possible. Time before the script ran counts as visible
// unless the page is hidden when it runs.
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
  } catch (e) {}
})();
`;
