// The home page's sections, as the nav entries, the Reading Home and the
// Cabin Screen's tabs name them, and how many rows each list shows there.
// See docs/adr/0011-home-is-a-cabin-over-a-reading-home.md and
// docs/adr/0005-curated-home-full-pages.md.

// The cap counts derived rows, so a Family costs one slot no matter how many
// Packages it holds. See docs/adr/0007-package-families.md.
export const HOME_LIMIT = 6;

export type HomeSectionId = 'about' | 'open-source' | 'projects' | 'blog' | 'online';

// In nav and tab order. `id` is the section's element id in the Reading Home.
export const HOME_SECTIONS: { id: HomeSectionId; title: string }[] = [
  { id: 'about', title: 'About' },
  { id: 'open-source', title: 'Open Source' },
  { id: 'projects', title: 'Projects' },
  { id: 'blog', title: 'Blog' },
  { id: 'online', title: 'Online' },
];

// The link to a section of the home page, from any page.
export const sectionHref = (id: HomeSectionId) => `/#${id}`;

// The section a URL hash (with its '#') names, or null.
export function sectionFromHash(hash: string): HomeSectionId | null {
  const id = hash.replace(/^#/, '');
  return HOME_SECTIONS.find((section) => section.id === id)?.id ?? null;
}

// Dispatched on window, with the section's id as `detail`, when a nav entry
// is activated.
export const HOME_SECTION_EVENT = 'home-section';
