import type { Metadata } from 'next';
import { Section, LinkRow } from '@/components/lists';
import { projects } from '@/lib/projects';

// Full list of Projects (services) — the overflow target of the home page's
// capped "Projects" section.
export const metadata: Metadata = {
  title: 'Projects — Ki Hyun Park',
  description: 'Services and applications built by Ki Hyun Park.',
  alternates: { canonical: '/projects' },
};

export default function ProjectsPage() {
  return (
    <Section title="Projects">
      {projects.map((project) => (
        <LinkRow key={project.href} href={project.href} name={project.name} />
      ))}
    </Section>
  );
}
