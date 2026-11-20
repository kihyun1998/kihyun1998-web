import { createClientStore } from './client-store';

export const HOME_LIMIT = 6;

export type HomeSectionId = 'about' | 'open-source' | 'projects' | 'blog' | 'online';

export const HOME_SECTIONS: { id: HomeSectionId; title: string }[] = [
  { id: 'about', title: 'About' },
  { id: 'open-source', title: 'Open Source' },
  { id: 'projects', title: 'Projects' },
  { id: 'blog', title: 'Blog' },
  { id: 'online', title: 'Online' },
];

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
