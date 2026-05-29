import { Children } from 'react';
import Link from 'next/link';

// The "Open Source" / "Projects" list primitives, shared by the home page
// (capped) and the full-list pages (/open-source, /projects).

export function Section({
  title,
  seeAllHref,
  children,
}: {
  title: string;
  // When set, renders a "See all →" internal link below the list. The home
  // page passes this only when the section is truncated.
  seeAllHref?: string;
  children: React.ReactNode;
}) {
  const isEmpty = Children.count(children) === 0;
  return (
    <section className="mt-20">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {isEmpty ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">{children}</ul>
      )}
      {seeAllHref && !isEmpty && (
        <Link
          href={seeAllHref}
          className="mt-4 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          See all →
        </Link>
      )}
    </section>
  );
}

// One row: a name linking to its canonical (external) destination, with an
// optional trailing meta label (e.g. the Ecosystem tag on Package rows).
export function LinkRow({
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
        <span className="min-w-0 break-words text-foreground underline-offset-4 transition-colors group-hover:text-link group-hover:underline">
          {name}
        </span>
        {meta && (
          <span className="shrink-0 text-sm text-muted-foreground">{meta}</span>
        )}
      </a>
    </li>
  );
}
