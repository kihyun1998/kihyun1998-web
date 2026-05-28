'use client';

// Theme toggle. Defaults to the OS preference (applied by the blocking script
// in layout.tsx before paint); this button lets the visitor override it and
// persists the override in localStorage. Theme is a separate concern from
// Language: it overrides an environment preference, not declared content, so
// it has no React context — it just flips the `dark` class on <html>.

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'theme';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
  }

  // Render a stable placeholder until mounted so server and client markup
  // match (the server can't know the resolved theme).
  if (!mounted) {
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
