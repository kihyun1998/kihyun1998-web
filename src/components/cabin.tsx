'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Car } from 'lucide-react';
import {
  AVIF_KEY,
  AVIF_PROBE,
  CHOICE_KEY,
  COVER_GAVE_UP_EVENT,
  FRAME_TEST_KEY,
  avifFor,
  coverState,
  liftCover,
  probeAvif,
} from '@/lib/cabin-cover';
import { homeFor, type Home, type Lighting, type StoredHome } from '@/lib/cabin-rules';
import type { Cabin as CabinScene } from '@/lib/cabin-scene';
import { createClientStore } from '@/lib/client-store';
import { HOME_SECTION_EVENT, sectionFromHash, shownSection } from '@/lib/home';
import { isDarkNow, themeStore } from '@/lib/theme';
import { useLanguage } from '@/components/language';

const HOME_ATTRIBUTE = 'data-home';

const lightingNow = (): Lighting => (isDarkNow() ? 'night' : 'day');

const homeStore = createClientStore();

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

let probing = false;
let storedAvif: string | null = null;
let probeAnswer: boolean | null = null;
const decodesAvif = () => {
  if (!probing) {
    probing = true;
    storedAvif = read(AVIF_KEY);
    probeAvif(new Image(), AVIF_PROBE, (decodes) => {
      probeAnswer = decodes;
      write(AVIF_KEY, decodes ? null : 'unsupported');
    });
  }
  return avifFor(storedAvif, probeAnswer);
};

let webgl: boolean | null = null;
let broken = false;
const startable = () => {
  if (webgl === null) {
    try {
      webgl = document.createElement('canvas').getContext('webgl2') !== null;
    } catch {
      webgl = false;
    }
  }
  return webgl && !broken;
};

const canRun = (): boolean | null => (startable() ? decodesAvif() : false);

let late = false;
let lateSeen = false;
const notInTime = () => {
  if (lateSeen) return;
  lateSeen = true;
  console.warn('The Cabin was not ready in time.');
  late = true;
  liftCover(document.documentElement);
  homeStore.notify();
};

const giveUp = () => {
  broken = true;
  liftCover(document.documentElement);
  homeStore.notify();
};

const storedChoice = (): StoredHome => {
  const stored = read(CHOICE_KEY);
  return stored === 'cabin' || stored === 'reading-home' ? stored : null;
};

const homeNow = (): Home | null => {
  if (late) return 'reading-home';
  if (canRun() === null) return null;
  return homeFor({
    webgl: startable(),
    avif: decodesAvif() !== false,
    frameTestFailed: read(FRAME_TEST_KEY) === 'failed',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    choice: storedChoice(),
  });
};

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

  useEffect(() => {
    const root = document.documentElement;
    window.addEventListener(COVER_GAVE_UP_EVENT, notInTime);
    if (coverState(root) === 'gave-up') notInTime();
    return () => {
      window.removeEventListener(COVER_GAVE_UP_EVENT, notInTime);
      liftCover(root);
    };
  }, []);

  if (!decided || !available) return null;

  return createPortal(<Layer home={home} />, document.body);
}

function Layer({ home }: { home: Home }) {
  if (home === 'reading-home') {
    return (
      <button
        type="button"
        onClick={() => {
          late = false;
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

function CabinStage() {
  const stage = useRef<HTMLDivElement>(null);
  const scene = useRef<CabinScene | null>(null);
  const [ready, setReady] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const router = useRouter();
  const { language } = useLanguage();
  const lighting = useSyncExternalStore(themeStore.subscribe, lightingNow, lightingNow);
  const latest = useRef({ language, lighting });
  useEffect(() => {
    latest.current = { language, lighting };
    scene.current?.setLanguage(language);
    scene.current?.setLighting(lighting);
  }, [language, lighting]);

  useEffect(() => {
    let left = false;
    import('@/lib/cabin-scene')
      .then(({ mountCabin }) => {
        if (left || !stage.current) return;
        scene.current = mountCabin(
          stage.current,
          {
            onReady: () => {
              liftCover(document.documentElement);
              setReady(true);
            },
            onView: (view) => {
              setZoomed(view.zoomed);
              shownSection.set(view);
              if (!view.zoomed && window.location.hash) {
                const { pathname, search } = window.location;
                window.history.replaceState(window.history.state, '', pathname + search);
              }
            },
            onFrameTestFailed: () => write(FRAME_TEST_KEY, 'failed'),
            onError: (error) => {
              console.error('The Cabin could not start.', error);
              giveUp();
            },
            onNavigate: (href) => router.push(href),
          },
          {
            ...latest.current,
            tab: sectionFromHash(window.location.hash),
            fontFamily: getComputedStyle(document.body).fontFamily,
          },
        );
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
      shownSection.set(null);
    };
  }, [router]);

  useEffect(() => {
    const show = (event: Event) => {
      const tab = sectionFromHash(`#${(event as CustomEvent<string>).detail}`);
      if (tab) scene.current?.showTab(tab);
    };
    window.addEventListener(HOME_SECTION_EVENT, show);
    return () => window.removeEventListener(HOME_SECTION_EVENT, show);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.setAttribute(HOME_ATTRIBUTE, 'cabin');
    return () => root.removeAttribute(HOME_ATTRIBUTE);
  }, [ready]);

  useEffect(() => {
    const covered = Array.from(document.querySelectorAll<HTMLElement>('main > *')).filter(
      (element) => !(ready && element.classList.contains('site-header')),
    );
    for (const element of covered) element.inert = true;
    return () => {
      for (const element of covered) element.inert = false;
    };
  }, [ready]);

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
          className="absolute bottom-4 left-4 z-10 inline-flex items-center sm:left-1/2 sm:-translate-x-1/2 gap-1.5 rounded-full bg-black/55 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-black/75"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </button>
      )}
    </div>
  );
}
