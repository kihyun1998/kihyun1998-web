// The site's own origin.
//
// Non-www apex is canonical; www 301s here. It was written out four times
// across three files — twice in the root layout (metadataBase and the
// OpenGraph url), once in robots, and once as a local ORIGIN in sitemap —
// which is three producers of one identity, each correct on its own.
//
// Nothing breaks when those disagree: every URL still resolves, every page
// still renders. What goes wrong is downstream and quiet — a canonical
// pointing at one host while the sitemap advertises another, and the same
// content indexed twice.
//
// Not here, on purpose:
//
// - The AdSense publisher id sits in the layout and in public/ads.txt. The
//   latter is plain text served to crawlers and cannot import a constant, so
//   the two cannot be unified; inside TypeScript there is only one.
export const SITE_ORIGIN = 'https://kihyun1998.com';

// The two outbound destinations of the nav area, also listed by the home
// page's Blog and Online sections.
export const BLOG_URL = 'https://blog.kihyun1998.com';
export const GITHUB_URL = 'https://github.com/kihyun1998';
