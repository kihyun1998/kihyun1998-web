// The Open Source list. See CONTEXT.md ("Project", "Ecosystem") and
// docs/adr/0003-minimal-project-card.md.
//
// Rules locked in during the design grill:
// - Hand-curated, not auto-pulled from GitHub. Only things worth showing.
// - A card shows exactly two things: `name` and `ecosystem`. No description.
// - Clicking a card goes to `href` — always the canonical GitHub repo.
// - Order is by curation within natural ecosystem clusters: the clustering
//   emerges from the order of this array, there are no per-ecosystem headers.
//   Put the project you most want seen first within each cluster.

export type Ecosystem = 'Flutter' | 'Rust' | 'TypeScript';

export type Project = {
  name: string;
  ecosystem: Ecosystem;
  href: string;
};

// TODO(kihyun): replace these placeholders with your real curated projects,
// in the order you want them shown.
export const projects: Project[] = [
  { name: 'example-flutter-widgets', ecosystem: 'Flutter', href: 'https://github.com/kihyun1998/example-flutter-widgets' },
  { name: 'example-flutter-pkg', ecosystem: 'Flutter', href: 'https://github.com/kihyun1998/example-flutter-pkg' },
  { name: 'example-rust-cli', ecosystem: 'Rust', href: 'https://github.com/kihyun1998/example-rust-cli' },
  { name: 'example-ts-lib', ecosystem: 'TypeScript', href: 'https://github.com/kihyun1998/example-ts-lib' },
];
