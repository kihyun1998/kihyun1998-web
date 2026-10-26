import type { Metadata } from 'next';
import { DependencyMap } from '@/components/dependency-map';
import { BackLink } from '@/components/lists';
import { dependencyGraph } from '@/lib/open-source';

// The Dependency Map. A static segment, so it wins over /open-source/[family];
// `dependencies` is a reserved Family slug for the same reason.
// See docs/adr/0010-dependency-map.md.
export const metadata: Metadata = {
  title: 'Dependencies — Ki Hyun Park',
  description: 'Which of Ki Hyun Park’s open-source packages build on which.',
  alternates: { canonical: '/open-source/dependencies' },
};

export default function DependenciesPage() {
  return (
    <>
      <section aria-labelledby="dependencies" className="mt-16">
        <h2 id="dependencies" className="text-base font-semibold text-foreground">
          Dependencies
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Which packages build on which
        </p>
        <div className="mt-6">
          <DependencyMap graph={dependencyGraph} />
        </div>
      </section>
      <BackLink href="/open-source">← Open Source</BackLink>
    </>
  );
}
