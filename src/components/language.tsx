'use client';

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
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {}
  return stored === 'ko' || stored === 'en' ? stored : 'en';
};

const englishOnServer = (): Language => 'en';

type LanguageContextValue = {
  language: Language;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    languageStore.subscribe,
    storedLanguage,
    englishOnServer,
  );

  const toggle = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, storedLanguage() === 'en' ? 'ko' : 'en');
    } catch {}
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
      aria-label={language === 'en' ? 'Switch to Korean' : 'Switch to English'}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {language === 'en' ? 'KO' : 'EN'}
    </button>
  );
}
