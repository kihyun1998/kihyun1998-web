import { Children } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const slugify = (title: string) => title.toLowerCase().replace(/\s+/g, '-');

const borderedSpacing = 'mt-12 border-t border-border pt-12';

export function Section({
  title,
  lede,
  seeAllHref,
  bordered = false,
  children,
}: {
  title: string;
  lede?: string;
  seeAllHref?: string;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  const isEmpty = Children.count(children) === 0;

  return (
    <section
      aria-labelledby={slugify(title)}
      className={cn('mt-16', bordered && borderedSpacing)}
    >
      <SectionHeading title={title} lede={lede} />
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

export function SectionHeading({
  title,
  lede,
  aside,
}: {
  title: string;
  lede?: string;
  aside?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={slugify(title)} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {aside}
      </div>
      {lede && <p className="mt-1 text-sm text-muted-foreground">{lede}</p>}
    </>
  );
}

export const sectionId = slugify;

const rowClassName = 'group flex items-baseline justify-between gap-4 py-3';

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
