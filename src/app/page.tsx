import { IdentityStatement } from '@/components/identity-statement';
import { Section, LinkRow } from '@/components/lists';
import { packages } from '@/lib/open-source';
import { projects } from '@/lib/projects';

// Home shows a curated subset of each section, capped at HOME_LIMIT. Each
// section always links to its full-list page (/open-source, /projects) — even
// when nothing overflows, so those pages are never orphaned from the site's
// internal link graph. See docs/adr/0005-curated-home-full-pages.md.
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
        {packages.slice(0, HOME_LIMIT).map((pkg) => (
          <LinkRow key={pkg.href} href={pkg.href} name={pkg.name} meta={pkg.ecosystem} />
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
