// The "Projects" section — standalone services/apps that a person uses directly
// (not building blocks). See CONTEXT.md ("Project") and
// docs/adr/0004-open-source-vs-projects.md.
//
// Rules:
// - Hand-curated.
// - A card currently shows just `name`, linking to `href` (its canonical
//   destination). Extra metadata (live URL vs repo, a kind label) is DEFERRED —
//   to be decided later, per the design grill.

export type Project = {
  name: string;
  // Canonical destination. For a deployed service this should eventually be the
  // live URL; for now it points at the GitHub repo. TODO(kihyun): decide.
  href: string;
};

// Example data — real repos, selection/order are placeholders.
// TODO(kihyun): finalize which projects to show, their order, and href targets.
export const projects: Project[] = [
  { name: 'youtube-comment-exporter', href: 'https://github.com/kihyun1998/youtube-comment-exporter' },
  { name: 'video-to-subtitle', href: 'https://github.com/kihyun1998/video-to-subtitle' },
];
