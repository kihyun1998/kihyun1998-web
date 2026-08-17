'use client';

// Language state for Translatable Content. Persisted in localStorage; no URL
// routing, no Accept-Language detection. Defaults to English on first visit.
// See docs/adr/0001-language-strategy.md.

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createClientStore } from '@/lib/client-store';
import type { Language } from '@/lib/i18n';

const STORAGE_KEY = 'lang';

const languageStore = createClientStore();

const storedLanguage = (): Language => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'ko' || stored === 'en' ? stored : 'en';
};

// The server has no localStorage, so it renders English — see the flash note on
// the provider below.
const englishOnServer = (): Language => 'en';

type LanguageContextValue = {
  language: Language;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Renders 'en' to match the server-rendered HTML, then adopts the stored
  // choice at hydration. One sentence may briefly flash EN→KO; acceptable.
  // localStorage stays the source of truth — there is no copy of it in state.
  const language = useSyncExternalStore(
    languageStore.subscribe,
    storedLanguage,
    englishOnServer,
  );

  const toggle = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, storedLanguage() === 'en' ? 'ko' : 'en');
    languageStore.notify();
  }, []);

  return (
    <LanguageContext.Provider value={{ language, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export function LanguageToggle() {
  const { language, toggle } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggle}
      // The label shows the language you'll switch TO, not the current one.
      aria-label={language === 'en' ? 'Switch to Korean' : 'Switch to English'}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {language === 'en' ? 'KO' : 'EN'}
    </button>
  );
}
