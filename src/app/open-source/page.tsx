import type { Metadata } from 'next';
import Link from 'next/link';
import { Section } from '@/components/lists';
import { OpenSourceRow } from '@/components/open-source-row';
import { openSourceLede, openSourceRows } from '@/lib/open-source';

// Full list of Packages — the overflow target of the home page's
// capped "Open Source" section. Families stay collapsed here too; their own
// page is the only place members are enumerated. The Dependency Map is linked
// from here, below the list, and from nowhere else.
export const metadata: Metadata = {
  title: 'Open Source — Ki Hyun Park',
  description:
    'Open-source packages by Ki Hyun Park across Flutter, Rust, and npm.',
  alternates: { canonical: '/open-source' },
};

export default function OpenSourcePage() {
  return (
    <>
      <Section title="Open Source" lede={openSourceLede}>
        {openSourceRows.map((row) => (
          <OpenSourceRow key={row.href} row={row} />
        ))}
      </Section>
      {/* Styled like "See all →", the other navigational link in this area. */}
      <Link
        href="/open-source/dependencies"
        className="mt-6 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Dependency map →
      </Link>
    </>
  );
}
