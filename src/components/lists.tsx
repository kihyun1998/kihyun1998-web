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

const rowClassName = 'group flex items-baseline justify-between gap-4 py-3';

// Both row variants share this so the list reads as one list regardless of
// where a given row sends you.
function RowContent({ name, meta }: { name: string; meta?: string }) {
  return (
    <>
      <span className="min-w-0 break-words text-foreground underline-offset-4 group-hover:underline">
        {name}
      </span>
      {meta && (
        <span className="shrink-0 text-sm text-muted-foreground">{meta}</span>
      )}
    </>
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
      <a href={href} target="_blank" rel="noreferrer" className={rowClassName}>
        <RowContent name={name} meta={meta} />
      </a>
    </li>
  );
}

// Same row, but staying on this site — used by Family rows, whose canonical
// destination is a page here rather than a registry.
// See docs/adr/0007-package-families.md.
export function InternalLinkRow({
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
      <Link href={href} className={rowClassName}>
        <RowContent name={name} meta={meta} />
      </Link>
    </li>
  );
}

// The "← Open Source" affordance on a Family page. Styled like "See all →" so
// the two navigational links in the Open Source area match.
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mt-8 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}
