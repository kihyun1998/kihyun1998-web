import { Cabin } from '@/components/cabin';
import { IdentityStatement } from '@/components/identity-statement';
import { Section, LinkRow } from '@/components/lists';
import { OpenSourceRow } from '@/components/open-source-row';
import { screenContent } from '@/lib/cabin-screen';
import { HOME_LIMIT } from '@/lib/home';
import { openSourceLede, openSourceRows } from '@/lib/open-source';
import { projects, projectsLede } from '@/lib/projects';

// The Reading Home, with the Cabin mounted over it in the browser. It shows a
// curated subset of each list, capped at HOME_LIMIT. Each list always links to
// its full-list page (/open-source, /projects) — even when nothing overflows,
// so those pages are never orphaned from the site's internal link graph. See
// docs/adr/0005-curated-home-full-pages.md. Its sections are the ones the nav
// entries and the Cabin Screen's tabs name (src/lib/home.ts); Blog and Online
// list what those tabs list.

export default function Home() {
  return (
    <>
      <div id="about" className="mt-6">
        <IdentityStatement />
      </div>

      <Section
        title="Open Source"
        lede={openSourceLede}
        seeAllHref="/open-source"
      >
        {openSourceRows.slice(0, HOME_LIMIT).map((row) => (
          <OpenSourceRow key={row.href} row={row} />
        ))}
      </Section>

      <Section
        title="Projects"
        lede={projectsLede}
        seeAllHref="/projects"
        bordered
      >
        {projects.slice(0, HOME_LIMIT).map((project) => (
          <LinkRow
            key={project.href}
            href={project.href}
            name={project.name}
            description={project.description}
          />
        ))}
      </Section>

      {(['blog', 'online'] as const).map((id) => {
        const { title, items } = screenContent(id, 'en');
        return (
          <Section key={id} title={title} bordered>
            {items.map((item) => (
              <LinkRow key={item.href} href={item.href} name={item.name} meta={item.meta} />
            ))}
          </Section>
        );
      })}

      <Cabin />
    </>
  );
}
