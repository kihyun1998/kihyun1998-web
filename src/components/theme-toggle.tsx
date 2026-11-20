'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { isDarkNow, setDark, themeStore } from '@/lib/theme';

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
