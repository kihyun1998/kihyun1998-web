import { Cabin } from '@/components/cabin';
import { IdentityStatement } from '@/components/identity-statement';
import { Section, LinkRow } from '@/components/lists';
import { OpenSourceRow } from '@/components/open-source-row';
import { HOME_LIMIT, homeLinks, sectionTitle } from '@/lib/home';
import { openSourceLede, openSourceRows } from '@/lib/open-source';
import { projects, projectsLede } from '@/lib/projects';

export default function Home() {
  return (
    <>
      <div id="about" className="mt-6">
        <IdentityStatement />
      </div>

      <Section
        title={sectionTitle('open-source')}
        lede={openSourceLede}
        seeAllHref="/open-source"
      >
        {openSourceRows.slice(0, HOME_LIMIT).map((row) => (
          <OpenSourceRow key={row.href} row={row} />
        ))}
      </Section>

      <Section
        title={sectionTitle('projects')}
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

      {(['blog', 'online'] as const).map((id) => (
        <Section key={id} title={sectionTitle(id)} bordered>
          {homeLinks[id].map((link) => (
            <LinkRow key={link.href} href={link.href} name={link.name} meta={link.meta} />
          ))}
        </Section>
      ))}

      <Cabin />
    </>
  );
}
