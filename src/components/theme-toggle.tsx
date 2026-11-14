'use client';

// Theme toggle. Defaults to the OS preference (applied by the blocking script
// in layout.tsx before paint); this button lets the visitor override it and
// persists the override in localStorage. Theme is a separate concern from
// Language: it overrides an environment preference, not declared content, so
// it has no React context — it lives in the `dark` class on <html>, held by
// src/lib/theme.ts, which the Cabin reads its lighting from too.

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { isDarkNow, setDark, themeStore } from '@/lib/theme';

// The server can't know the resolved theme, so it reports nothing and the
// button renders as a stable placeholder until hydration.
const unknownOnServer = () => null;

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    themeStore.subscribe,
    isDarkNow,
    unknownOnServer,
  );

  if (isDark === null) {
    return <span className="inline-block size-4" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={() => setDark(!isDarkNow())}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
