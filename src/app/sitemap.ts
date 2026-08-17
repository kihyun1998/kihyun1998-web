import type { MetadataRoute } from 'next';
import { families } from '@/lib/open-source';

const ORIGIN = 'https://kihyun1998.com';

// The site's full route list: three fixed pages, plus one page per Family.
// The Family entries are derived from the same array the pages render, so a new
// Family cannot ship without entering the sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: ORIGIN },
    { url: `${ORIGIN}/open-source` },
    { url: `${ORIGIN}/projects` },
    ...families.map((family) => ({
      url: `${ORIGIN}/open-source/${family.slug}`,
    })),
  ];
}
