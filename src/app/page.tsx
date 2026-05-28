import { ArrowUpRight } from 'lucide-react';
import { IdentityStatement } from '@/components/identity-statement';
import { LanguageToggle } from '@/components/language';
import { ThemeToggle } from '@/components/theme-toggle';
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

      <section className="mt-20">
        <h2 className="text-sm font-medium text-muted-foreground">
          Open Source
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {projects.map((project) => (
            <li key={project.href}>
              <a
                href={project.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-baseline justify-between gap-4 py-3"
              >
                <span className="text-link underline-offset-4 group-hover:underline">
                  {project.name}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {project.ecosystem}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-24 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Ki Hyun Park
      </footer>
    </main>
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
