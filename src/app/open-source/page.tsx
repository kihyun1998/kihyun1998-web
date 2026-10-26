import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeading, sectionId } from '@/components/lists';
import { OpenSourceList } from '@/components/open-source-list';
import { openSourceLede, openSourceRows } from '@/lib/open-source';

// Full list of Packages — the overflow target of the home page's
// capped "Open Source" section, filtered by Ecosystem and paged. Families stay
// collapsed here too; their own page is the only place members are enumerated.
// The Dependency Map is linked from this heading and from nowhere else.
export const metadata: Metadata = {
  title: 'Open Source — Ki Hyun Park',
  description:
    'Open-source packages by Ki Hyun Park across Flutter, Rust, and npm.',
  alternates: { canonical: '/open-source' },
};

export default function OpenSourcePage() {
  return (
    <section aria-labelledby={sectionId('Open Source')} className="mt-16">
      <SectionHeading
        title="Open Source"
        lede={openSourceLede}
        aside={
          // Styled like "See all →", the other navigational link in this area.
          <Link
            href="/open-source/dependencies"
            className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Dependency map →
          </Link>
        }
      />
      <OpenSourceList rows={openSourceRows} />
    </section>
  );
}
