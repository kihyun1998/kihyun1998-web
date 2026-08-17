import { describe, expect, it } from 'vitest';
import {
  deriveOpenSourceRows,
  families,
  openSourceRows,
  packages,
  resolveFamily,
  type Ecosystem,
  type Family,
  type Package,
} from './open-source';

// Tests assert on the list a visitor would see — the sequence of rows, their
// kinds, names, and meta — not on how the grouping is computed. Validation
// rules are driven with fixtures so the real curated arrays are never mutated.

const pkg = (name: string, ecosystem: Ecosystem): Package => ({
  name,
  ecosystem,
  href: `https://example.test/${name}`,
});

// A miniature catalogue with the same shape as the real one: an ecosystem
// cluster, then a family that straddles two ecosystems, then loose packages.
const fixturePackages: Package[] = [
  pkg('alpha_widget', 'Flutter'),
  pkg('beta_widget', 'Flutter'),
  pkg('demo-core', 'Rust'),
  pkg('loose-crate', 'Rust'),
  pkg('demo-web', 'npm'),
  pkg('demo-renderer', 'npm'),
  pkg('loose-package', 'npm'),
];

const fixtureFamilies: Family[] = [
  {
    slug: 'demo',
    name: 'demo',
    members: ['demo-core', 'demo-web', 'demo-renderer'],
  },
];

const names = (rows: ReturnType<typeof deriveOpenSourceRows>) =>
  rows.map((row) => row.name);

describe('deriveOpenSourceRows', () => {
  it('collapses a Family into a single row carrying its name and member count', () => {
    const rows = deriveOpenSourceRows(fixturePackages, fixtureFamilies);
    const family = rows.find((row) => row.kind === 'family');

    expect(family).toEqual({
      kind: 'family',
      slug: 'demo',
      name: 'demo',
      href: '/open-source/demo',
      memberCount: 3,
    });
  });

  it('does not also list a Family member as a standalone row', () => {
    const rows = deriveOpenSourceRows(fixturePackages, fixtureFamilies);

    expect(names(rows)).not.toContain('demo-core');
    expect(names(rows)).not.toContain('demo-web');
    expect(names(rows)).not.toContain('demo-renderer');
  });

  it('leaves ungrouped Packages as individual rows with their Ecosystem', () => {
    const rows = deriveOpenSourceRows(fixturePackages, fixtureFamilies);

    expect(rows).toContainEqual({
      kind: 'package',
      name: 'loose-crate',
      ecosystem: 'Rust',
      href: 'https://example.test/loose-crate',
    });
  });

  it('places the Family cluster where curation put its first member, keeping declared order elsewhere', () => {
    const rows = deriveOpenSourceRows(fixturePackages, fixtureFamilies);

    expect(names(rows)).toEqual([
      'alpha_widget',
      'beta_widget',
      'demo',
      'loose-crate',
      'loose-package',
    ]);
  });

  it('lets a Family occupy one slot when the list is capped', () => {
    const rows = deriveOpenSourceRows(fixturePackages, fixtureFamilies);
    const capped = rows.slice(0, 3);

    expect(names(capped)).toEqual(['alpha_widget', 'beta_widget', 'demo']);
  });

  it('returns every Package as its own row when no Family is declared', () => {
    const rows = deriveOpenSourceRows(fixturePackages, []);

    expect(names(rows)).toEqual(fixturePackages.map((entry) => entry.name));
    expect(rows.every((row) => row.kind === 'package')).toBe(true);
  });

  it('supports a Family whose members all share one Ecosystem', () => {
    const singleEcosystem: Family[] = [
      { slug: 'widgets', name: 'widgets', members: ['alpha_widget', 'beta_widget'] },
    ];
    const rows = deriveOpenSourceRows(fixturePackages, singleEcosystem);

    expect(names(rows)).toEqual([
      'widgets',
      'demo-core',
      'loose-crate',
      'demo-web',
      'demo-renderer',
      'loose-package',
    ]);
  });

  it('rejects a Family naming a Package that does not exist', () => {
    const broken: Family[] = [
      { slug: 'demo', name: 'demo', members: ['demo-core', 'demo-typo'] },
    ];

    expect(() => deriveOpenSourceRows(fixturePackages, broken)).toThrow(
      /demo-typo/,
    );
  });

  it('rejects a Package claimed by two Families', () => {
    const overlapping: Family[] = [
      { slug: 'demo', name: 'demo', members: ['demo-core', 'demo-web'] },
      { slug: 'other', name: 'other', members: ['demo-core', 'demo-renderer'] },
    ];

    expect(() => deriveOpenSourceRows(fixturePackages, overlapping)).toThrow(
      /demo-core/,
    );
  });

  it('rejects a Family with fewer than two members', () => {
    const lonely: Family[] = [
      { slug: 'demo', name: 'demo', members: ['demo-core'] },
    ];

    expect(() => deriveOpenSourceRows(fixturePackages, lonely)).toThrow(
      /at least two/i,
    );
  });

  it('rejects a duplicate Family slug', () => {
    const duplicated: Family[] = [
      { slug: 'demo', name: 'demo', members: ['demo-core', 'demo-web'] },
      { slug: 'demo', name: 'demo again', members: ['loose-crate', 'loose-package'] },
    ];

    expect(() => deriveOpenSourceRows(fixturePackages, duplicated)).toThrow(
      /slug/i,
    );
  });

  it('rejects a Family slug that is not URL-safe', () => {
    const unsafe: Family[] = [
      { slug: 'Demo Suite', name: 'demo', members: ['demo-core', 'demo-web'] },
    ];

    expect(() => deriveOpenSourceRows(fixturePackages, unsafe)).toThrow(
      /slug/i,
    );
  });
});

describe('resolveFamily', () => {
  it('resolves members to full Package records in declared order', () => {
    const family = resolveFamily('demo', fixturePackages, fixtureFamilies);

    expect(family).toEqual({
      slug: 'demo',
      name: 'demo',
      members: [
        pkg('demo-core', 'Rust'),
        pkg('demo-web', 'npm'),
        pkg('demo-renderer', 'npm'),
      ],
    });
  });

  it('returns undefined for an unknown slug', () => {
    expect(resolveFamily('nope', fixturePackages, fixtureFamilies)).toBeUndefined();
  });
});

describe('the curated catalogue', () => {
  it('derives without violating any Family rule', () => {
    expect(() => deriveOpenSourceRows()).not.toThrow();
  });

  it('shows justerm as one row standing in for its four packages', () => {
    const justerm = openSourceRows.find(
      (row) => row.kind === 'family' && row.slug === 'justerm',
    );

    expect(justerm).toMatchObject({ name: 'justerm', memberCount: 4 });
    expect(names(openSourceRows)).not.toContain('justerm-core');
  });

  it('shows justpdf as one row, flagship Package included', () => {
    const justpdf = openSourceRows.find(
      (row) => row.kind === 'family' && row.slug === 'justpdf',
    );

    expect(justpdf).toMatchObject({ name: 'justpdf', memberCount: 5 });
    // The Family and its flagship member share a name; only the Family shows.
    expect(
      openSourceRows.filter((row) => row.name === 'justpdf'),
    ).toHaveLength(1);
    expect(resolveFamily('justpdf')?.members.map((m) => m.name)).toContain(
      'justpdf',
    );
  });

  it('keeps every Family member declared exactly once in packages', () => {
    const memberNames = families.flatMap((family) => family.members);
    const packageNames = packages.map((entry) => entry.name);

    for (const member of memberNames) {
      expect(packageNames.filter((name) => name === member)).toHaveLength(1);
    }
  });
});
