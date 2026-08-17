import { InternalLinkRow, LinkRow } from '@/components/lists';
import type { OpenSourceRow as Row } from '@/lib/open-source';

// One derived Open Source row. A Package leaves for its registry; a Family
// stays on this site. Shared by the home page and /open-source so both render
// a Family the same way — collapsed, never expanded inline.
// See docs/adr/0007-package-families.md.
export function OpenSourceRow({ row }: { row: Row }) {
  if (row.kind === 'family') {
    return (
      <InternalLinkRow
        href={row.href}
        name={row.name}
        meta={`${row.memberCount} packages`}
      />
    );
  }

  return <LinkRow href={row.href} name={row.name} meta={row.ecosystem} />;
}
