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
  return (
    <section className="mt-20">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="mt-4 divide-y divide-border">{children}</ul>
      {seeAllHref && (
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
