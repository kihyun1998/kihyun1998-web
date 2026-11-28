import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { DomeLightsToggle } from '@/components/dome-lights-toggle';
import { HomeNav } from '@/components/home-nav';
import { LanguageToggle } from '@/components/language';
import { ThemeToggle } from '@/components/theme-toggle';
import { BLOG_URL, GITHUB_URL } from '@/lib/site';

export function SiteHeader() {
  return (
    <header className="site-header">
      <h1 className="text-xl font-semibold tracking-tight">
        <Link href="/" className="transition-opacity hover:opacity-70">
          Ki Hyun Park
        </Link>
      </h1>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <HomeNav />
        <span className="h-4 w-px bg-border" aria-hidden />
        <ExternalLink href={BLOG_URL}>Blog</ExternalLink>
        <ExternalLink href={GITHUB_URL}>GitHub</ExternalLink>
        <span className="h-4 w-px bg-border" aria-hidden />
        <LanguageToggle />
        <ThemeToggle />
        <DomeLightsToggle />
      </nav>
    </header>
  );
}

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
