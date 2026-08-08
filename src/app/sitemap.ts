import type { MetadataRoute } from 'next';

// The site's full route list. Kept by hand — there are only three routes and
// none are generated, so a manual list is honest about what exists.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://kihyun1998.com' },
    { url: 'https://kihyun1998.com/open-source' },
    { url: 'https://kihyun1998.com/projects' },
  ];
}
