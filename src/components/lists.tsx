import { Children } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// The "Open Source" / "Projects" list primitives, shared by the home page
// (capped) and the full-list pages (/open-source, /projects).
//
// The heading is deliberately stronger than the rows beneath it: the page's
// structure — Packages here, Projects there — is the site's organising idea
// (ADR-0004) and used to be invisible, rendered quieter than its own content.
// See docs/adr/0008-home-introduces-the-person.md.

const slugify = (title: string) => title.toLowerCase().replace(/\s+/g, '-');

// A bordered section splits its gap either side of the rule. Keeping the base
// `mt-16` would stack margin and padding into a gap twice any other on the
// page, which reads as an accident rather than a break.
const borderedSpacing = 'mt-12 border-t border-border pt-12';

export function Section({
  title,
  lede,
  seeAllHref,
  bordered = false,
  children,
}: {
  title: string;
  // One English line saying what this section lists. Not Translatable Content.
  lede?: string;
  // When set, renders a "See all →" internal link below the list. The home
  // page passes this only when the section is truncated.
  seeAllHref?: string;
  // Draws the boundary above this section. Set on every section after the
  // first, so a page of several sections reads as several sections.
  bordered?: boolean;
  children: React.ReactNode;
}) {
  const isEmpty = Children.count(children) === 0;
  const headingId = slugify(title);

  return (
    <section
      aria-labelledby={headingId}
      className={cn('mt-16', bordered && borderedSpacing)}
    >
      <h2 id={headingId} className="text-base font-semibold text-foreground">
        {title}
      </h2>
      {lede && <p className="mt-1 text-sm text-muted-foreground">{lede}</p>}
      {isEmpty ? (
        <p className="mt-6 text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border">{children}</ul>
      )}
      {seeAllHref && !isEmpty && (
        <Link
          href={seeAllHref}
          className="mt-6 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          See all →
        </Link>
      )}
    </section>
  );
}

const rowClassName = 'group flex items-baseline justify-between gap-4 py-3';

// Both row variants share this so the list reads as one list regardless of
// where a given row sends you. A `description` sits under the name inside the
// same link, so a row stays one focusable target.
function RowContent({
  name,
  meta,
  description,
}: {
  name: string;
  meta?: string;
  description?: string;
}) {
  return (
    <>
      <span className="min-w-0">
        <span className="block break-words text-foreground underline-offset-4 group-hover:underline">
          {name}
        </span>
        {description && (
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {meta && (
        <span className="shrink-0 text-sm text-muted-foreground">{meta}</span>
      )}
    </>
  );
}

// One row: a name linking to its canonical (external) destination, with an
// optional trailing meta label (e.g. the Ecosystem tag on Package rows) and an
// optional description beneath (Projects only — see ADR-0003 and ADR-0008).
export function LinkRow({
  href,
  name,
  meta,
  description,
}: {
  href: string;
  name: string;
  meta?: string;
  description?: string;
}) {
  return (
    <li>
      <a href={href} target="_blank" rel="noreferrer" className={rowClassName}>
        <RowContent name={name} meta={meta} description={description} />
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
