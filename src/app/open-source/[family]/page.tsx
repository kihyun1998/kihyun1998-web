import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BackLink, Section } from '@/components/lists';
import { PackageRow } from '@/components/open-source-row';
import { families, resolveFamily } from '@/lib/open-source';

type Params = { family: string };

export function generateStaticParams(): Params[] {
  return families.map((family) => ({ family: family.slug }));
}

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
          <PackageRow key={member.href} pkg={member} />
        ))}
      </Section>
      <BackLink href="/open-source">← Open Source</BackLink>
    </>
  );
}
