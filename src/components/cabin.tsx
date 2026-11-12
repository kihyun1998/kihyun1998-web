'use client';

// The Cabin over the Reading Home. The server renders nothing here; in the
// browser the Cabin-or-Reading-Home rule decides whether the Cabin covers the
// page, and a switch lets the visitor choose and stores the choice. What it
// draws goes into <body>, outside the page's <main>. It lifts the loading
// cover the <head> script put up once the Cabin is ready or not coming.
// See docs/adr/0011-home-is-a-cabin-over-a-reading-home.md.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookOpen, Car } from 'lucide-react';
import {
  CHOICE_KEY,
  COVER_GAVE_UP_EVENT,
  FRAME_TEST_KEY,
  coverState,
  liftCover,
} from '@/lib/cabin-cover';
import { homeFor, type Home, type StoredHome } from '@/lib/cabin-rules';
import type { Cabin as CabinScene } from '@/lib/cabin-scene';
import { createClientStore } from '@/lib/client-store';

const homeStore = createClientStore();

// The stored values as this page load knows them: what it wrote, over what
// localStorage held. They outlive the page only where localStorage works.
const written = new Map<string, string | null>();
const read = (key: string) => {
  if (written.has(key)) return written.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  written.set(key, value);
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  homeStore.notify();
};

// Whether this browser can run the Cabin: it has WebGL 2, and on this page
// load the Cabin has neither failed to start nor run out of time. Read first
// at hydration, when the <head> script may already have given up.
let webgl: boolean | null = null;
let broken = false;
const canRun = () => {
  if (webgl === null) {
    try {
      webgl = document.createElement('canvas').getContext('webgl2') !== null;
    } catch {
      webgl = false;
    }
    if (coverState(document.documentElement) === 'gave-up') broken = true;
  }
  return webgl && !broken;
};

// The Cabin is not coming on this page load: the Reading Home, without the
// switch, until the next load.
const giveUp = () => {
  broken = true;
  liftCover(document.documentElement);
  homeStore.notify();
};

const storedChoice = (): StoredHome => {
  const stored = read(CHOICE_KEY);
  return stored === 'cabin' || stored === 'reading-home' ? stored : null;
};

const homeNow = (): Home =>
  homeFor({
    webgl: canRun(),
    frameTestFailed: read(FRAME_TEST_KEY) === 'failed',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    choice: storedChoice(),
  });

// The server cannot know any of it, so it reports nothing and renders nothing.
const unknownOnServer = () => null;

const switchClass =
  'fixed right-4 bottom-4 z-50 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors';

export function Cabin() {
  const home = useSyncExternalStore(homeStore.subscribe, homeNow, unknownOnServer);
  const available = useSyncExternalStore(homeStore.subscribe, canRun, unknownOnServer);
  const decided = home !== null && available !== null;
  const cabin = home === 'cabin' && available === true;

  useEffect(() => {
    if (decided && !cabin) liftCover(document.documentElement);
  }, [decided, cabin]);

  // The <head> script gives up when the Cabin is not ready in time; leaving
  // the home page lifts the cover.
  useEffect(() => {
    const root = document.documentElement;
    const notInTime = () => {
      console.warn('The Cabin was not ready in time.');
      giveUp();
    };
    window.addEventListener(COVER_GAVE_UP_EVENT, notInTime);
    if (coverState(root) === 'gave-up' && !broken) notInTime();
    return () => {
      window.removeEventListener(COVER_GAVE_UP_EVENT, notInTime);
      liftCover(root);
    };
  }, []);

  if (!decided || !available) return null;

  return createPortal(<Layer home={home} />, document.body);
}

// The switch to the Cabin, or the Cabin with the switch to the Reading Home.
function Layer({ home }: { home: Home }) {
  if (home === 'reading-home') {
    return (
      <button
        type="button"
        onClick={() => {
          // Choosing the Cabin runs the frame test again.
          write(FRAME_TEST_KEY, null);
          write(CHOICE_KEY, 'cabin');
        }}
        className={`${switchClass} border border-border bg-background text-muted-foreground hover:text-foreground`}
      >
        <Car className="size-4" aria-hidden />
        Cabin
      </button>
    );
  }

  return (
    <>
      <CabinStage />
      <button
        type="button"
        onClick={() => write(CHOICE_KEY, 'reading-home')}
        className={`${switchClass} bg-black/55 text-white hover:bg-black/75`}
      >
        <BookOpen className="size-4" aria-hidden />
        Reading Home
      </button>
    </>
  );
}

// The full-screen layer the Cabin is drawn in, with its loading state and the
// Back control shown while zoomed to the Cabin Screen.
function CabinStage() {
  const stage = useRef<HTMLDivElement>(null);
  const scene = useRef<CabinScene | null>(null);
  const [ready, setReady] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let left = false;
    import('@/lib/cabin-scene')
      .then(({ mountCabin }) => {
        if (left || !stage.current) return;
        scene.current = mountCabin(stage.current, {
          onReady: () => {
            liftCover(document.documentElement);
            setReady(true);
          },
          onZoom: setZoomed,
          onFrameTestFailed: () => write(FRAME_TEST_KEY, 'failed'),
          onError: (error) => {
            console.error('The Cabin could not start.', error);
            giveUp();
          },
        });
        if (process.env.NODE_ENV !== 'production') {
          (window as unknown as { __cabin?: CabinScene }).__cabin = scene.current;
        }
      })
      .catch((error) => {
        console.error('The Cabin could not load.', error);
        giveUp();
      });
    return () => {
      left = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  // The Reading Home underneath does not scroll while the Cabin covers it.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, []);

  return (
    <div ref={stage} className="fixed inset-0 z-40 touch-none bg-[#0b0c0e]">
      <p
        role="status"
        className={`cabin-loading absolute inset-0 z-10 transition-opacity duration-500 ${ready ? 'pointer-events-none opacity-0' : ''}`}
      >
        {ready ? '' : 'Loading the Cabin…'}
      </p>
      {zoomed && (
        <button
          type="button"
          onClick={() => scene.current?.zoomOut()}
          className="absolute top-6 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-black/75"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </button>
      )}
    </div>
  );
}
