import { IdentityStatement } from '@/components/identity-statement';
import { Section, LinkRow } from '@/components/lists';
import { OpenSourceRow } from '@/components/open-source-row';
import { openSourceRows } from '@/lib/open-source';
import { projects } from '@/lib/projects';

// Home shows a curated subset of each section, capped at HOME_LIMIT. Each
// section always links to its full-list page (/open-source, /projects) — even
// when nothing overflows, so those pages are never orphaned from the site's
// internal link graph. See docs/adr/0005-curated-home-full-pages.md.
//
// The cap counts derived rows, so a Family costs one slot no matter how many
// Packages it holds. See docs/adr/0007-package-families.md.
const HOME_LIMIT = 6;

export default function Home() {
  return (
    <>
      <div className="mt-6">
        <IdentityStatement />
      </div>

      <Section
        title="Open Source"
        seeAllHref="/open-source"
      >
        {openSourceRows.slice(0, HOME_LIMIT).map((row) => (
          <OpenSourceRow key={row.href} row={row} />
        ))}
      </Section>

      <Section
        title="Projects"
        seeAllHref="/projects"
      >
        {projects.slice(0, HOME_LIMIT).map((project) => (
          <LinkRow key={project.href} href={project.href} name={project.name} />
        ))}
      </Section>
    </>
  );
}
