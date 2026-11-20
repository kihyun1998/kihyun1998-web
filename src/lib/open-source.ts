export const openSourceLede =
  'Libraries, plugins, and crates other developers install and build on';

export type Ecosystem = 'Flutter' | 'Rust' | 'npm';

export type Package = {
  name: string;
  ecosystem: Ecosystem;
  href: string;
  repo: string;
  uses?: string[];
  exampleUses?: string[];
};

export type Family = {
  slug: string;
  name: string;
  members: string[];
};

export const packages: Package[] = [
  { name: 'flutter_bin', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_bin', repo: 'https://github.com/kihyun1998/flutter_bin' },
  { name: 'x509_cert_store', ecosystem: 'Flutter', href: 'https://pub.dev/packages/x509_cert_store', repo: 'https://github.com/kihyun1998/x509_cert_store' },
  { name: 'flutter_alone', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_alone', repo: 'https://github.com/kihyun1998/flutter_alone' },
  { name: 'flutter_inactive_timer', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_inactive_timer', repo: 'https://github.com/kihyun1998/flutter_inactive_timer' },
  { name: 'flutter_ime', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_ime', repo: 'https://github.com/kihyun1998/flutter_ime' },
  { name: 'flutter_password_input', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_password_input', repo: 'https://github.com/kihyun1998/flutter_password_input', uses: ['flutter_ime', 'just_tooltip'] },
  { name: 'flutter_license_manager', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_license_manager', repo: 'https://github.com/kihyun1998/flutter_license_manager' },
  { name: 'flutter_oss_manager', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_oss_manager', repo: 'https://github.com/kihyun1998/flutter_oss_manager' },
  { name: 'flutter_table_plus', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_table_plus', repo: 'https://github.com/kihyun1998/flutter_table_plus', uses: ['flutter_checkbox', 'just_tooltip', 'flutter_smooth_wheel_scroll'], exampleUses: ['flutter_example_template', 'flutter_syntax_highlight'] },
  { name: 'macos_window_toolkit', ecosystem: 'Flutter', href: 'https://pub.dev/packages/macos_window_toolkit', repo: 'https://github.com/kihyun1998/macos_window_toolkit' },
  { name: 'flutter_animation_stepper', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_animation_stepper', repo: 'https://github.com/kihyun1998/flutter_animation_stepper' },
  { name: 'flutter_dropdown_button', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_dropdown_button', repo: 'https://github.com/kihyun1998/flutter_dropdown_button', uses: ['flutter_checkbox', 'flutter_smooth_wheel_scroll'], exampleUses: ['flutter_example_template'] },
  { name: 'flutter_checkbox', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_checkbox', repo: 'https://github.com/kihyun1998/flutter_checkbox' },
  { name: 'flutter_folderview', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_folderview', repo: 'https://github.com/kihyun1998/flutter_folderview', uses: ['just_tooltip'], exampleUses: ['flutter_example_template', 'flutter_smooth_wheel_scroll'] },
  { name: 'flutter_otp_widget', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_otp_widget', repo: 'https://github.com/kihyun1998/flutter_otp_widget' },
  { name: 'flutter_root_context_menu', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_root_context_menu', repo: 'https://github.com/kihyun1998/flutter_root_context_menu' },
  { name: 'flutter_show_menu', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_show_menu', repo: 'https://github.com/kihyun1998/flutter_show_menu' },
  { name: 'flutter_tweakcn_generator', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_tweakcn_generator', repo: 'https://github.com/kihyun1998/flutter_tweakcn_generator' },
  { name: 'just_color_picker', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_color_picker', repo: 'https://github.com/kihyun1998/just_color_picker' },
  { name: 'just_font_scan', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_font_scan', repo: 'https://github.com/kihyun1998/just_font_scan' },
  { name: 'just_save_gallery', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_save_gallery', repo: 'https://github.com/kihyun1998/just_save_gallery' },
  { name: 'just_tooltip', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_tooltip', repo: 'https://github.com/kihyun1998/just_tooltip' },
  { name: 'boring_avatars', ecosystem: 'Flutter', href: 'https://pub.dev/packages/boring_avatars', repo: 'https://github.com/kihyun1998/boring_avatars' },
  { name: 'ffi_url_launcher', ecosystem: 'Flutter', href: 'https://pub.dev/packages/ffi_url_launcher', repo: 'https://github.com/kihyun1998/ffi_url_launcher' },
  { name: 'just_sonner', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_sonner', repo: 'https://github.com/kihyun1998/just_sonner', uses: ['flutter_smooth_wheel_scroll'] },
  { name: 'flutter_syntax_highlight', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_syntax_highlight', repo: 'https://github.com/kihyun1998/flutter_syntax_highlight', uses: ['flutter_smooth_wheel_scroll'] },
  { name: 'flutter_example_template', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_example_template', repo: 'https://github.com/kihyun1998/flutter_example_template', uses: ['flutter_syntax_highlight', 'flutter_smooth_wheel_scroll'] },
  { name: 'flutter_smooth_wheel_scroll', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_smooth_wheel_scroll', repo: 'https://github.com/kihyun1998/flutter_smooth_wheel_scroll' },

  { name: 'justpdf', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf', repo: 'https://github.com/kihyun1998/justpdf', uses: ['justpdf-core', 'justpdf-render'] },
  { name: 'justpdf-core', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-core', repo: 'https://github.com/kihyun1998/justpdf', uses: ['justbig2', 'justjp2'] },
  { name: 'justpdf-render', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-render', repo: 'https://github.com/kihyun1998/justpdf', uses: ['justpdf-core'] },
  { name: 'justpdf-formats', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-formats', repo: 'https://github.com/kihyun1998/justpdf', uses: ['justpdf-core', 'justpdf-render'] },
  { name: 'justpdf-special', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-special', repo: 'https://github.com/kihyun1998/justpdf', uses: ['justpdf-core', 'justpdf-render'] },
  { name: 'justpdf-ffi', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-ffi', repo: 'https://github.com/kihyun1998/justpdf', uses: ['justpdf-core', 'justpdf-render'] },
  { name: 'justpdf-cli', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-cli', repo: 'https://github.com/kihyun1998/justpdf', uses: ['justpdf-core', 'justpdf-formats', 'justpdf-render'] },
  { name: 'justbig2', ecosystem: 'Rust', href: 'https://crates.io/crates/justbig2', repo: 'https://github.com/kihyun1998/justbig2' },
  { name: 'justjp2', ecosystem: 'Rust', href: 'https://crates.io/crates/justjp2', repo: 'https://github.com/kihyun1998/justjp2' },
  { name: 'justerm-core', ecosystem: 'Rust', href: 'https://crates.io/crates/justerm-core', repo: 'https://github.com/kihyun1998/justerm' },
  { name: 'justsftp', ecosystem: 'Rust', href: 'https://crates.io/crates/justsftp', repo: 'https://github.com/kihyun1998/justsftp' },

  { name: 'justpdf-compress-wasm', ecosystem: 'npm', href: 'https://www.npmjs.com/package/@kihyun1998/justpdf-compress-wasm', repo: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justerm-web', ecosystem: 'npm', href: 'https://www.npmjs.com/package/justerm-web', repo: 'https://github.com/kihyun1998/justerm', uses: ['justerm-renderer', 'justerm-wasm-decode'] },
  { name: 'justerm-renderer', ecosystem: 'npm', href: 'https://www.npmjs.com/package/justerm-renderer', repo: 'https://github.com/kihyun1998/justerm' },
  { name: 'justerm-wasm-decode', ecosystem: 'npm', href: 'https://www.npmjs.com/package/justerm-wasm-decode', repo: 'https://github.com/kihyun1998/justerm' },
  { name: 'justable', ecosystem: 'npm', href: 'https://www.npmjs.com/package/@kihyun1998/justable', repo: 'https://github.com/kihyun1998/justable' },
];

export const families: Family[] = [
  {
    slug: 'justpdf',
    name: 'justpdf',
    members: [
      'justpdf',
      'justpdf-core',
      'justpdf-render',
      'justpdf-formats',
      'justpdf-special',
      'justpdf-ffi',
      'justpdf-cli',
      'justbig2',
      'justjp2',
      'justpdf-compress-wasm',
    ],
  },
  {
    slug: 'justerm',
    name: 'justerm',
    members: ['justerm-core', 'justerm-web', 'justerm-renderer', 'justerm-wasm-decode'],
  },
];

export type PackageRow = Package & { kind: 'package' };

export type FamilyRow = {
  kind: 'family';
  slug: string;
  name: string;
  href: string;
  memberCount: number;
  ecosystems: Ecosystem[];
};

export type OpenSourceRow = PackageRow | FamilyRow;

export type ResolvedFamily = {
  slug: string;
  name: string;
  members: Package[];
};

const URL_SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED_SLUGS = new Set(['dependencies']);

function indexByName(allPackages: Package[]): Map<string, Package> {
  return new Map(allPackages.map((entry) => [entry.name, entry]));
}

function resolveMembers(
  family: Family,
  byName: Map<string, Package>,
): Package[] {
  return family.members.map((member) => {
    const entry = byName.get(member);
    if (!entry) {
      throw new Error(
        `Family "${family.slug}" names "${member}", which is not in packages.`,
      );
    }
    return entry;
  });
}

function assertFamiliesAreWellFormed(
  byName: Map<string, Package>,
  allFamilies: Family[],
): void {
  const claimedBy = new Map<string, string>();
  const slugs = new Set<string>();

  for (const family of allFamilies) {
    if (!URL_SAFE_SLUG.test(family.slug)) {
      throw new Error(
        `Family slug "${family.slug}" is not URL-safe (lowercase letters, digits, single hyphens).`,
      );
    }
    if (RESERVED_SLUGS.has(family.slug)) {
      throw new Error(
        `Family slug "${family.slug}" is taken by the page at /open-source/${family.slug}.`,
      );
    }
    if (slugs.has(family.slug)) {
      throw new Error(`Duplicate Family slug "${family.slug}".`);
    }
    slugs.add(family.slug);

    if (family.members.length < 2) {
      throw new Error(
        `Family "${family.slug}" needs at least two members; a Family of one is just a Package.`,
      );
    }

    resolveMembers(family, byName);

    for (const member of family.members) {
      const owner = claimedBy.get(member);
      if (owner) {
        throw new Error(
          `Package "${member}" is claimed by both "${owner}" and "${family.slug}"; a Package belongs to at most one Family.`,
        );
      }
      claimedBy.set(member, family.slug);
    }
  }
}

export function deriveOpenSourceRows(
  allPackages: Package[] = packages,
  allFamilies: Family[] = families,
): OpenSourceRow[] {
  assertFamiliesAreWellFormed(indexByName(allPackages), allFamilies);

  const familyOfMember = new Map<string, Family>();
  for (const family of allFamilies) {
    for (const member of family.members) {
      familyOfMember.set(member, family);
    }
  }

  const emitted = new Set<string>();
  const rows: OpenSourceRow[] = [];

  for (const entry of allPackages) {
    const family = familyOfMember.get(entry.name);
    if (!family) {
      rows.push({ kind: 'package', ...entry });
      continue;
    }
    if (emitted.has(family.slug)) continue;
    emitted.add(family.slug);
    const members = new Set(family.members);
    rows.push({
      kind: 'family',
      slug: family.slug,
      name: family.name,
      href: `/open-source/${family.slug}`,
      memberCount: family.members.length,
      ecosystems: [
        ...new Set(
          allPackages
            .filter((candidate) => members.has(candidate.name))
            .map((candidate) => candidate.ecosystem),
        ),
      ],
    });
  }

  return rows;
}

export const openSourceRows: OpenSourceRow[] = deriveOpenSourceRows();

export const OPEN_SOURCE_PAGE_SIZE = 15;

export type OpenSourceListView = {
  rows: OpenSourceRow[];
  ecosystem: Ecosystem | undefined;
  page: number;
  pageCount: number;
  filters: { ecosystem: Ecosystem | undefined; count: number }[];
};

const rowEcosystems = (row: OpenSourceRow): Ecosystem[] =>
  row.kind === 'package' ? [row.ecosystem] : row.ecosystems;

export function viewOpenSourceList(
  rows: OpenSourceRow[],
  query: { eco?: string | null; page?: string | null },
  perPage: number = OPEN_SOURCE_PAGE_SIZE,
): OpenSourceListView {
  const order = [...new Set(rows.flatMap(rowEcosystems))];
  const ecosystem = order.find((candidate) => candidate === query.eco);
  const filtered = ecosystem
    ? rows.filter((row) => rowEcosystems(row).includes(ecosystem))
    : rows;

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const requested = /^\d+$/.test(query.page ?? '') ? Number(query.page) : 1;
  const page = Math.min(Math.max(requested, 1), pageCount);

  return {
    rows: filtered.slice((page - 1) * perPage, page * perPage),
    ecosystem,
    page,
    pageCount,
    filters: [
      { ecosystem: undefined, count: rows.length },
      ...order.map((candidate) => ({
        ecosystem: candidate,
        count: rows.filter((row) => rowEcosystems(row).includes(candidate))
          .length,
      })),
    ],
  };
}

export function resolveFamily(
  slug: string,
  allPackages: Package[] = packages,
  allFamilies: Family[] = families,
): ResolvedFamily | undefined {
  const family = allFamilies.find((candidate) => candidate.slug === slug);
  if (!family) return undefined;

  return {
    slug: family.slug,
    name: family.name,
    members: resolveMembers(family, indexByName(allPackages)),
  };
}

export type DependencyLink = {
  from: string;
  to: string;
  kind: 'installed' | 'example';
};

export type DependencyGraph = {
  packages: Package[];
  links: DependencyLink[];
  unconnected: Package[];
};

export function deriveDependencyGraph(
  allPackages: Package[] = packages,
): DependencyGraph {
  const byName = indexByName(allPackages);
  const links: DependencyLink[] = [];

  for (const entry of allPackages) {
    const named = [
      ...(entry.uses ?? []).map((to) => ({ to, kind: 'installed' as const })),
      ...(entry.exampleUses ?? []).map((to) => ({ to, kind: 'example' as const })),
    ];
    const seen = new Set<string>();

    for (const { to, kind } of named) {
      if (!byName.has(to)) {
        throw new Error(`"${entry.name}" uses "${to}", which is not in packages.`);
      }
      if (byName.get(to)!.ecosystem !== entry.ecosystem) {
        throw new Error(
          `"${entry.name}" (${entry.ecosystem}) uses "${to}" (${byName.get(to)!.ecosystem}); the Dependency Map draws one Ecosystem at a time, so a Dependency stays within one.`,
        );
      }
      if (to === entry.name) {
        throw new Error(`"${entry.name}" lists itself as something it uses.`);
      }
      if (seen.has(to)) {
        throw new Error(
          `"${entry.name}" lists "${to}" twice; a Package is either a Dependency or an Example Dependency, once.`,
        );
      }
      seen.add(to);
      links.push({ from: entry.name, to, kind });
    }
  }

  const linked = new Set(links.flatMap((link) => [link.from, link.to]));
  return {
    packages: allPackages.filter((entry) => linked.has(entry.name)),
    links,
    unconnected: allPackages.filter((entry) => !linked.has(entry.name)),
  };
}

export const dependencyGraph: DependencyGraph = deriveDependencyGraph();
