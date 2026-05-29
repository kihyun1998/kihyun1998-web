// The "Projects" section — standalone services/apps that a person uses directly
// (not building blocks). See CONTEXT.md ("Project") and
// docs/adr/0004-open-source-vs-projects.md.
//
// Rules:
// - Hand-curated.
// - A card shows just `name`, linking to `href`. For a deployed service the
//   href is its live URL (where you actually use it).

export type Project = {
  name: string;
  // Canonical destination: the live service URL.
  href: string;
};

export const projects: Project[] = [
  { name: 'Just MLB', href: 'https://mlb.kihyun1998.com/' },
];
