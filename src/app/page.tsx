import { Cabin } from '@/components/cabin';
import { IdentityStatement } from '@/components/identity-statement';
import { Section, LinkRow } from '@/components/lists';
import { OpenSourceRow } from '@/components/open-source-row';
import { screenContent } from '@/lib/cabin-screen';
import { HOME_LIMIT } from '@/lib/home';
import { openSourceLede, openSourceRows } from '@/lib/open-source';
import { projects, projectsLede } from '@/lib/projects';

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
