import { createClientStore } from './client-store';
import { BLOG_URL, GITHUB_URL } from './site';

export const HOME_LIMIT = 6;

export type HomeSectionId = 'about' | 'open-source' | 'projects' | 'blog' | 'online';

const SECTION_TITLES: Record<HomeSectionId, string> = {
  about: 'About',
  'open-source': 'Open Source',
  projects: 'Projects',
  blog: 'Blog',
  online: 'Online',
};

export const sectionTitle = (id: HomeSectionId) => SECTION_TITLES[id];

export const HOME_SECTIONS = Object.entries(SECTION_TITLES).map(([id, title]) => ({
  id: id as HomeSectionId,
  title,
}));

export type HomeLink = { name: string; meta?: string; href: string };

const BLOG_HOST = new URL(BLOG_URL).host;

export const homeLinks: Record<'blog' | 'online', HomeLink[]> = {
  blog: [{ name: BLOG_HOST, href: BLOG_URL }],
  online: [
    { name: 'GitHub', meta: 'kihyun1998', href: GITHUB_URL },
    { name: 'Blog', meta: BLOG_HOST, href: BLOG_URL },
  ],
};

export const sectionHref = (id: HomeSectionId) => `/#${id}`;

export function sectionFromHash(hash: string): HomeSectionId | null {
  const id = hash.replace(/^#/, '');
  return HOME_SECTIONS.find((section) => section.id === id)?.id ?? null;
}

export const HOME_SECTION_EVENT = 'home-section';

const shownStore = createClientStore();
let shown: HomeSectionId | null = null;
export const shownSection = {
  subscribe: shownStore.subscribe,
  get: (): HomeSectionId | null => shown,
  set(view: { zoomed: boolean; tab: HomeSectionId } | null) {
    const next = view?.zoomed ? view.tab : null;
    if (next === shown) return;
    shown = next;
    shownStore.notify();
  },
};
