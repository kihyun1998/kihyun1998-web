'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { HOME_SECTIONS, HOME_SECTION_EVENT, sectionHref, shownSection } from '@/lib/home';

const noneOnServer = () => null;

export function HomeNav() {
  const shown = useSyncExternalStore(shownSection.subscribe, shownSection.get, noneOnServer);
  return (
    <>
      {HOME_SECTIONS.map(({ id, title }) => (
        <Link
          key={id}
          href={sectionHref(id)}
          aria-current={shown === id ? 'true' : undefined}
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            window.dispatchEvent(new CustomEvent(HOME_SECTION_EVENT, { detail: id }));
            if (window.location.pathname === '/') document.getElementById(id)?.scrollIntoView();
          }}
          className={`text-sm transition-colors hover:text-foreground ${
            shown === id
              ? 'text-foreground underline decoration-2 underline-offset-[6px]'
              : 'text-muted-foreground'
          }`}
        >
          {title}
        </Link>
      ))}
    </>
  );
}
