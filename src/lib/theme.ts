// The theme as the page holds it: the `dark` class on <html>, put there before
// paint by the script in layout.tsx (the stored choice, else the OS setting)
// and changed by the theme toggle. The toggle and the Cabin both read it from
// here.

import { createClientStore } from './client-store';

const STORAGE_KEY = 'theme';

// Notifies when the theme changes.
export const themeStore = createClientStore();

export const isDarkNow = () => document.documentElement.classList.contains('dark');

// Sets the theme and stores it as the visitor's choice.
export function setDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {}
  themeStore.notify();
}
