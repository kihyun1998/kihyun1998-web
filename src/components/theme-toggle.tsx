'use client';

// Theme toggle. Defaults to the OS preference (applied by the blocking script
// in layout.tsx before paint); this button lets the visitor override it and
// persists the override in localStorage. Theme is a separate concern from
// Language: it overrides an environment preference, not declared content, so
// it has no React context — it just flips the `dark` class on <html>.

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { createClientStore } from '@/lib/client-store';

const STORAGE_KEY = 'theme';

const themeStore = createClientStore();

// The resolved theme lives on <html>, not in React state — the blocking script
// puts it there before paint. Reading it back on every render keeps that class
// the single source of truth.
const isDarkNow = () => document.documentElement.classList.contains('dark');

// The server can't know the resolved theme, so it reports nothing and the
// button renders as a stable placeholder until hydration.
const unknownOnServer = () => null;

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    themeStore.subscribe,
    isDarkNow,
    unknownOnServer,
  );

  function toggle() {
    const next = !isDarkNow();
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    themeStore.notify();
  }

  if (isDark === null) {
    return <span className="inline-block size-4" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
