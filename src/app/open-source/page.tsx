import type { Metadata } from 'next';
import { Section } from '@/components/lists';
import { OpenSourceRow } from '@/components/open-source-row';
import { openSourceLede, openSourceRows } from '@/lib/open-source';

// Full list of Packages — the overflow target of the home page's
// capped "Open Source" section. Families stay collapsed here too; their own
// page is the only place members are enumerated.
export const metadata: Metadata = {
  title: 'Open Source — Ki Hyun Park',
  description:
    'Open-source packages by Ki Hyun Park across Flutter, Rust, and npm.',
  alternates: { canonical: '/open-source' },
};

export default function OpenSourcePage() {
  return (
    <Section title="Open Source" lede={openSourceLede}>
      {openSourceRows.map((row) => (
        <OpenSourceRow key={row.href} row={row} />
      ))}
    </Section>
  );
}
