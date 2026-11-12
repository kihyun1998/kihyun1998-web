'use client';

// The nav area's internal entries: one link per section of the home page.
// Activating one also announces it on window, which is what zooms the Cabin
// to that tab of the Cabin Screen, and on the home page scrolls the Reading
// Home to the section; from another page the link's hash does.
// See docs/adr/0011-home-is-a-cabin-over-a-reading-home.md.

import Link from 'next/link';
import { HOME_SECTIONS, HOME_SECTION_EVENT, sectionHref } from '@/lib/home';

export function HomeNav() {
  return (
    <>
      {HOME_SECTIONS.map(({ id, title }) => (
        <Link
          key={id}
          href={sectionHref(id)}
          onClick={(event) => {
            // A press that opens the link elsewhere leaves this page as it is.
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            window.dispatchEvent(new CustomEvent(HOME_SECTION_EVENT, { detail: id }));
            if (window.location.pathname === '/') document.getElementById(id)?.scrollIntoView();
          }}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {title}
        </Link>
      ))}
    </>
  );
}
