'use client';

// Language state for Translatable Content. Persisted in localStorage; no URL
// routing, no Accept-Language detection. Defaults to English on first visit.
// See docs/adr/0001-language-strategy.md.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Language } from '@/lib/i18n';

const STORAGE_KEY = 'lang';

type LanguageContextValue = {
  language: Language;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start at 'en' to match the server-rendered HTML, then adopt the stored
  // choice after mount. One sentence may briefly flash EN→KO; acceptable.
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ko' || stored === 'en') setLanguage(stored);
  }, []);

  const toggle = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'ko' : 'en';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
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
