import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BackLink, LinkRow, Section } from '@/components/lists';
import { families, resolveFamily } from '@/lib/open-source';

// A Family page — the expansion of a collapsed Family row. It lists member
// Packages and nothing else: no blurb, no per-member description. ADR-0003's
// reasoning applies one level up. See docs/adr/0007-package-families.md.
//
// Members render as ordinary Package rows (Ecosystem tag, registry link), so
// ADR-0006 still holds for Packages wherever they appear.

type Params = { family: string };

export function generateStaticParams(): Params[] {
  return families.map((family) => ({ family: family.slug }));
}

// Every Family page is known at build time; an unknown slug is a 404, not a
// page rendered on demand.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { family: slug } = await params;
  const family = resolveFamily(slug);
  if (!family) return {};

  return {
    title: `${family.name} — Ki Hyun Park`,
    description: `The ${family.name} packages by Ki Hyun Park: ${family.members
      .map((member) => member.name)
      .join(', ')}.`,
    alternates: { canonical: `/open-source/${family.slug}` },
  };
}

export default async function FamilyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { family: slug } = await params;
  const family = resolveFamily(slug);
  if (!family) notFound();

  return (
    <>
      <Section title={family.name}>
        {family.members.map((member) => (
          <LinkRow
            key={member.href}
            href={member.href}
            name={member.name}
            meta={member.ecosystem}
          />
        ))}
      </Section>
      <BackLink href="/open-source">← Open Source</BackLink>
    </>
  );
}
