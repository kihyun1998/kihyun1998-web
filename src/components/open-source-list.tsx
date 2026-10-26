'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { OpenSourceRow } from '@/components/open-source-row';
import {
  viewOpenSourceList,
  type Ecosystem,
  type OpenSourceListView,
  type OpenSourceRow as Row,
} from '@/lib/open-source';
import { cn } from '@/lib/utils';

// The full Open Source list on /open-source: Ecosystem filters, the current
// page of rows, and page numbers. `?eco=&page=` picks the view in the browser,
// so the page itself stays prerendered; the prerendered HTML is All, page 1.
export function OpenSourceList({ rows }: { rows: Row[] }) {
  return (
    <Suspense fallback={<ListBody view={viewOpenSourceList(rows, {})} />}>
      <QueriedList rows={rows} />
    </Suspense>
  );
}

function QueriedList({ rows }: { rows: Row[] }) {
  const params = useSearchParams();
  const view = viewOpenSourceList(rows, {
    eco: params.get('eco'),
    page: params.get('page'),
  });
  return <ListBody view={view} />;
}

const hrefFor = (ecosystem: Ecosystem | undefined, page = 1) => {
  const query = new URLSearchParams();
  if (ecosystem) query.set('eco', ecosystem);
  if (page > 1) query.set('page', String(page));
  const search = query.toString();
  return search ? `/open-source?${search}` : '/open-source';
};

const linkClassName = (current: boolean) =>
  cn(
    'transition-colors',
    current
      ? 'text-foreground underline underline-offset-4'
      : 'text-muted-foreground hover:text-foreground',
  );

function ListBody({ view }: { view: OpenSourceListView }) {
  return (
    <>
      <nav
        aria-label="Filter by Ecosystem"
        className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm"
      >
        {view.filters.map(({ ecosystem, count }) => {
          const current = ecosystem === view.ecosystem;
          return (
            <Link
              key={ecosystem ?? 'All'}
              href={hrefFor(ecosystem)}
              scroll={false}
              aria-current={current ? 'true' : undefined}
              className={linkClassName(current)}
            >
              {ecosystem ?? 'All'} {count}
            </Link>
          );
        })}
      </nav>
      <ul className="mt-4 divide-y divide-border">
        {view.rows.map((row) => (
          <OpenSourceRow key={row.href} row={row} />
        ))}
      </ul>
      {view.pageCount > 1 && (
        <nav aria-label="Pages" className="mt-6 flex gap-3 text-sm tabular-nums">
          {Array.from({ length: view.pageCount }, (_, i) => i + 1).map((page) => {
            const current = page === view.page;
            return (
              <Link
                key={page}
                href={hrefFor(view.ecosystem, page)}
                scroll={false}
                aria-current={current ? 'page' : undefined}
                className={linkClassName(current)}
              >
                {page}
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
