import { ArrowUpRight } from 'lucide-react';
import { IdentityStatement } from '@/components/identity-statement';
import { LanguageToggle } from '@/components/language';
import { ThemeToggle } from '@/components/theme-toggle';
import { packages } from '@/lib/open-source';
import { projects } from '@/lib/projects';

// Home is a Server Component: the name, outbound links, and Open Source list
// are static and ship zero JS. Only the two toggles and the Identity Statement
// are client islands (they need localStorage / language state).

const BLOG_URL = 'https://blog.kihyun1998.com';
const GITHUB_URL = 'https://github.com/kihyun1998';

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24 sm:py-32">
      <header className="flex items-baseline justify-between gap-6">
        <h1 className="text-xl font-semibold tracking-tight">Ki Hyun Park</h1>
        <nav className="flex items-center gap-4">
          <ExternalLink href={BLOG_URL}>Blog</ExternalLink>
          <ExternalLink href={GITHUB_URL}>GitHub</ExternalLink>
          <span className="h-4 w-px bg-border" aria-hidden />
          <LanguageToggle />
          <ThemeToggle />
        </nav>
      </header>

      <div className="mt-6">
        <IdentityStatement />
      </div>

      <Section title="Open Source">
        {packages.map((pkg) => (
          <LinkRow key={pkg.href} href={pkg.href} name={pkg.name} meta={pkg.ecosystem} />
        ))}
      </Section>

      <Section title="Projects">
        {projects.map((project) => (
          <LinkRow key={project.href} href={project.href} name={project.name} />
        ))}
      </Section>

      <footer className="mt-24 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Ki Hyun Park
      </footer>
    </main>
  );
}

// A titled list section ("Open Source", "Projects").
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="mt-4 divide-y divide-border">{children}</ul>
    </section>
  );
}

// One row: a name linking to its canonical destination, with an optional
// trailing meta label (e.g. the Ecosystem tag on Package rows).
function LinkRow({
  href,
  name,
  meta,
}: {
  href: string;
  name: string;
  meta?: string;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group flex items-baseline justify-between gap-4 py-3"
      >
        <span className="text-link underline-offset-4 group-hover:underline">
          {name}
        </span>
        {meta && (
          <span className="shrink-0 text-sm text-muted-foreground">{meta}</span>
        )}
      </a>
    </li>
  );
}

// A nav link that leaves the site. Small trailing arrow signals "external",
// matching the reference sites.
function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ArrowUpRight className="size-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
