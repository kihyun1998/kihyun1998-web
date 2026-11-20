import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHeading, sectionId } from '@/components/lists';
import { OpenSourceList } from '@/components/open-source-list';
import { openSourceLede, openSourceRows } from '@/lib/open-source';

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
