import { describe, expect, it } from 'vitest';
import {
  deriveDependencyGraph,
  deriveOpenSourceRows,
  dependencyGraph,
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
  repo: `https://example.test/repo/${name}`,
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
      repo: 'https://example.test/repo/loose-crate',
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

  it('rejects the slug the Dependency Map page already uses', () => {
    const clashing: Family[] = [
      { slug: 'dependencies', name: 'deps', members: ['demo-core', 'demo-web'] },
    ];

    expect(() => deriveOpenSourceRows(fixturePackages, clashing)).toThrow(
      /dependencies/,
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

describe('deriveDependencyGraph', () => {
  const using = (
    name: string,
    uses?: string[],
    exampleUses?: string[],
  ): Package => ({ ...pkg(name, 'Flutter'), uses, exampleUses });

  const catalogue: Package[] = [
    using('app_widget', ['base_scroll', 'base_tooltip'], ['demo_shell']),
    pkg('loner', 'Flutter'),
    using('demo_shell', ['base_scroll']),
    pkg('base_scroll', 'Flutter'),
    pkg('base_tooltip', 'Flutter'),
  ];

  it('links each user to what it uses, telling installed from example-app use', () => {
    const { links } = deriveDependencyGraph(catalogue);

    expect(links).toEqual([
      { from: 'app_widget', to: 'base_scroll', kind: 'installed' },
      { from: 'app_widget', to: 'base_tooltip', kind: 'installed' },
      { from: 'app_widget', to: 'demo_shell', kind: 'example' },
      { from: 'demo_shell', to: 'base_scroll', kind: 'installed' },
    ]);
  });

  it('keeps only Packages on either end of a link, in declared order', () => {
    const graph = deriveDependencyGraph(catalogue);

    expect(graph.packages.map((entry) => entry.name)).toEqual([
      'app_widget',
      'demo_shell',
      'base_scroll',
      'base_tooltip',
    ]);
  });

  it('keeps every other Package as unconnected, in declared order', () => {
    const graph = deriveDependencyGraph(catalogue);

    expect(graph.unconnected.map((entry) => entry.name)).toEqual(['loner']);
  });

  it('rejects using a Package that does not exist', () => {
    expect(() =>
      deriveDependencyGraph([...catalogue, using('typo_user', ['base_scrol'])]),
    ).toThrow(/base_scrol/);
  });

  it('rejects a Package using itself', () => {
    expect(() =>
      deriveDependencyGraph([...catalogue, using('ouroboros', ['ouroboros'])]),
    ).toThrow(/ouroboros/);
  });

  it('rejects a Dependency across Ecosystems, which no tab of the map could show', () => {
    expect(() =>
      deriveDependencyGraph([
        ...catalogue,
        { ...pkg('rusty_bridge', 'Rust'), uses: ['base_scroll'] },
      ]),
    ).toThrow(/rusty_bridge/);
  });

  it('rejects the same Package listed twice', () => {
    expect(() =>
      deriveDependencyGraph([
        ...catalogue,
        using('twice', ['base_scroll'], ['base_scroll']),
      ]),
    ).toThrow(/twice/);
  });
});

describe('the curated catalogue', () => {
  it('derives a Dependency graph without violating any rule', () => {
    expect(() => deriveDependencyGraph()).not.toThrow();
  });

  it('records flutter_smooth_wheel_scroll as installed by five Packages', () => {
    const users = dependencyGraph.links.filter(
      (link) =>
        link.to === 'flutter_smooth_wheel_scroll' && link.kind === 'installed',
    );

    expect(users).toHaveLength(5);
  });

  it('records justpdf-core under six other justpdf crates', () => {
    const users = dependencyGraph.links.filter(
      (link) => link.to === 'justpdf-core',
    );

    expect(users).toHaveLength(6);
  });

  it('records flutter_example_template as used only by example apps', () => {
    const kinds = new Set(
      dependencyGraph.links
        .filter((link) => link.to === 'flutter_example_template')
        .map((link) => link.kind),
    );

    expect([...kinds]).toEqual(['example']);
  });

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

    expect(justpdf).toMatchObject({ name: 'justpdf', memberCount: 10 });
    // The Family and its flagship member share a name; only the Family shows.
    expect(
      openSourceRows.filter((row) => row.name === 'justpdf'),
    ).toHaveLength(1);
    expect(resolveFamily('justpdf')?.members.map((m) => m.name)).toContain(
      'justpdf',
    );
  });

  it('points monorepo packages at the shared repository, not one named after them', () => {
    const repoOf = (name: string) =>
      packages.find((entry) => entry.name === name)?.repo;

    expect(repoOf('justerm-web')).toBe('https://github.com/kihyun1998/justerm');
    expect(repoOf('justpdf-compress-wasm')).toBe(
      'https://github.com/kihyun1998/justpdf',
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
