import type { Metadata } from 'next';
import { Section, LinkRow } from '@/components/lists';
import { packages } from '@/lib/open-source';

// Full list of Packages — the overflow target of the home page's
// capped "Open Source" section.
export const metadata: Metadata = {
  title: 'Open Source — Ki Hyun Park',
};

export default function OpenSourcePage() {
  return (
    <Section title="Open Source">
      {packages.map((pkg) => (
        <LinkRow key={pkg.href} href={pkg.href} name={pkg.name} meta={pkg.ecosystem} />
      ))}
    </Section>
  );
}
