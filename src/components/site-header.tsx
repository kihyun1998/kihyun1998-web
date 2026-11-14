import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { HomeNav } from '@/components/home-nav';
import { LanguageToggle } from '@/components/language';
import { ThemeToggle } from '@/components/theme-toggle';
import { BLOG_URL, GITHUB_URL } from '@/lib/site';

// Shared across every page (rendered once in layout.tsx). The wordmark links
// home so subpages have a way back. The nav area holds the entries for the
// home page's sections, the two outbound links (Blog, GitHub) and the language
// and theme toggles — see GLOSSARY.md. globals.css lays `site-header` out, and
// on the home page lifts it over the Cabin while it is shown.

export function SiteHeader() {
  return (
    <header className="site-header">
      {/* The wordmark is the page's h1 on every route, so each page has one
          top-level heading and the Section headings sit under it as h2s. */}
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
      </nav>
    </header>
  );
}

// A nav link that leaves the site, with a small trailing "external" arrow.
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
