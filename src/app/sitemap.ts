import type { MetadataRoute } from 'next';
import { families } from '@/lib/open-source';
import { SITE_ORIGIN } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_ORIGIN },
    { url: `${SITE_ORIGIN}/open-source` },
    { url: `${SITE_ORIGIN}/open-source/dependencies` },
    { url: `${SITE_ORIGIN}/projects` },
    ...families.map((family) => ({
      url: `${SITE_ORIGIN}/open-source/${family.slug}`,
    })),
  ];
}
