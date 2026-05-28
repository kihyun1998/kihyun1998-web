// The "Open Source" section — Packages: reusable libraries/plugins/crates that
// other developers install and build on. See CONTEXT.md ("Package", "Ecosystem")
// and docs/adr/0003-minimal-project-card.md + 0004-open-source-vs-projects.md.
//
// Rules:
// - Hand-curated, not auto-pulled from GitHub.
// - A card shows exactly two things: `name` and `ecosystem`. No description.
// - Clicking a card goes to `href` — the canonical GitHub repo.
// - Order by curation within natural ecosystem clusters (no per-ecosystem
//   headers); put what you most want seen first within each cluster.

export type Ecosystem = 'Flutter' | 'Rust' | 'TypeScript';

export type Package = {
  name: string;
  ecosystem: Ecosystem;
  href: string;
};

// Example data — real repos, but the selection and order are placeholders.
// TODO(kihyun): finalize which packages to show and in what order.
export const packages: Package[] = [
  { name: 'flutter_table_plus', ecosystem: 'Flutter', href: 'https://github.com/kihyun1998/flutter_table_plus' },
  { name: 'flutter_folderview', ecosystem: 'Flutter', href: 'https://github.com/kihyun1998/flutter_folderview' },
  { name: 'just_color_picker', ecosystem: 'Flutter', href: 'https://github.com/kihyun1998/just_color_picker' },
  { name: 'flutter_ime', ecosystem: 'Flutter', href: 'https://github.com/kihyun1998/flutter_ime' },
  { name: 'justpdf', ecosystem: 'Rust', href: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justjp2', ecosystem: 'Rust', href: 'https://github.com/kihyun1998/justjp2' },
];
