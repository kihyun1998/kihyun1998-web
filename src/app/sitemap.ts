import type { MetadataRoute } from 'next';
import { families } from '@/lib/open-source';
import { SITE_ORIGIN } from '@/lib/site';

// The site's full route list: three fixed pages, plus one page per Family.
// The Family entries are derived from the same array the pages render, so a new
// Family cannot ship without entering the sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_ORIGIN },
    { url: `${SITE_ORIGIN}/open-source` },
    { url: `${SITE_ORIGIN}/projects` },
    ...families.map((family) => ({
      url: `${SITE_ORIGIN}/open-source/${family.slug}`,
    })),
  ];
}
