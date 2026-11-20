import { createClientStore } from './client-store';

const STORAGE_KEY = 'theme';

export const themeStore = createClientStore();

export const isDarkNow = () => document.documentElement.classList.contains('dark');

export function setDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {}
  themeStore.notify();
}
