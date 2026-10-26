// The "Open Source" section — Packages: reusable libraries/plugins/crates that
// other developers install and build on, and Families: groups of Packages built
// to be used together. See GLOSSARY.md ("Package", "Family", "Ecosystem") and
// docs/adr/0003-minimal-project-card.md + 0004-open-source-vs-projects.md +
// 0006-link-packages-to-registry.md + 0007-package-families.md.
//
// Source of truth: Kihyun's GitHub profile README (the curated list he
// maintains). Order here mirrors that README (ecosystem clusters: Flutter,
// then Rust, then npm).
//
// Rules:
// - Hand-curated, not auto-pulled from GitHub. Order is curation, never a sort.
// - A card shows exactly two things: `name` and `ecosystem`. No description.
// - A card carries two links: `href` — the package's registry page (pub.dev /
//   crates.io / npm), where install info, docs, and version live — and `repo`,
//   its source on GitHub. `repo` is written out, never derived from `name`:
//   packages in a monorepo (justpdf, justerm) share one repository.
//   See docs/adr/0009-package-rows-link-registry-and-repo.md.
// - A Package belongs to at most one Family, and is still declared exactly once
//   in `packages` — a Family references its members by name.

// Shown under the section heading. Lifted from GLOSSARY.md's definition of
// Package so the site and the glossary say the same thing in the same words.
// English-only, per ADR-0001's default for any new text.
export const openSourceLede =
  'Libraries, plugins, and crates other developers install and build on';

export type Ecosystem = 'Flutter' | 'Rust' | 'npm';

export type Package = {
  name: string;
  ecosystem: Ecosystem;
  // Registry page.
  href: string;
  // GitHub repository.
  repo: string;
};

// A group of Packages built to be used together. `members` names entries in
// `packages`, in the order they should be read (entry point first).
export type Family = {
  // URL segment: /open-source/<slug>
  slug: string;
  name: string;
  members: string[];
};

export const packages: Package[] = [
  // Flutter — pub.dev
  { name: 'flutter_bin', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_bin', repo: 'https://github.com/kihyun1998/flutter_bin' },
  { name: 'x509_cert_store', ecosystem: 'Flutter', href: 'https://pub.dev/packages/x509_cert_store', repo: 'https://github.com/kihyun1998/x509_cert_store' },
  { name: 'flutter_alone', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_alone', repo: 'https://github.com/kihyun1998/flutter_alone' },
  { name: 'flutter_inactive_timer', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_inactive_timer', repo: 'https://github.com/kihyun1998/flutter_inactive_timer' },
  { name: 'flutter_ime', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_ime', repo: 'https://github.com/kihyun1998/flutter_ime' },
  { name: 'flutter_password_input', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_password_input', repo: 'https://github.com/kihyun1998/flutter_password_input' },
  { name: 'flutter_license_manager', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_license_manager', repo: 'https://github.com/kihyun1998/flutter_license_manager' },
  { name: 'flutter_oss_manager', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_oss_manager', repo: 'https://github.com/kihyun1998/flutter_oss_manager' },
  { name: 'flutter_table_plus', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_table_plus', repo: 'https://github.com/kihyun1998/flutter_table_plus' },
  { name: 'macos_window_toolkit', ecosystem: 'Flutter', href: 'https://pub.dev/packages/macos_window_toolkit', repo: 'https://github.com/kihyun1998/macos_window_toolkit' },
  { name: 'flutter_animation_stepper', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_animation_stepper', repo: 'https://github.com/kihyun1998/flutter_animation_stepper' },
  { name: 'flutter_dropdown_button', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_dropdown_button', repo: 'https://github.com/kihyun1998/flutter_dropdown_button' },
  { name: 'flutter_checkbox', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_checkbox', repo: 'https://github.com/kihyun1998/flutter_checkbox' },
  { name: 'flutter_folderview', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_folderview', repo: 'https://github.com/kihyun1998/flutter_folderview' },
  { name: 'flutter_otp_widget', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_otp_widget', repo: 'https://github.com/kihyun1998/flutter_otp_widget' },
  { name: 'flutter_root_context_menu', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_root_context_menu', repo: 'https://github.com/kihyun1998/flutter_root_context_menu' },
  { name: 'flutter_show_menu', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_show_menu', repo: 'https://github.com/kihyun1998/flutter_show_menu' },
  { name: 'flutter_tweakcn_generator', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_tweakcn_generator', repo: 'https://github.com/kihyun1998/flutter_tweakcn_generator' },
  { name: 'just_color_picker', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_color_picker', repo: 'https://github.com/kihyun1998/just_color_picker' },
  { name: 'just_font_scan', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_font_scan', repo: 'https://github.com/kihyun1998/just_font_scan' },
  { name: 'just_save_gallery', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_save_gallery', repo: 'https://github.com/kihyun1998/just_save_gallery' },
  { name: 'just_tooltip', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_tooltip', repo: 'https://github.com/kihyun1998/just_tooltip' },
  { name: 'window_lockable', ecosystem: 'Flutter', href: 'https://pub.dev/packages/window_lockable', repo: 'https://github.com/kihyun1998/window_lockable' },
  { name: 'boring_avatars', ecosystem: 'Flutter', href: 'https://pub.dev/packages/boring_avatars', repo: 'https://github.com/kihyun1998/boring_avatars' },
  { name: 'ffi_url_launcher', ecosystem: 'Flutter', href: 'https://pub.dev/packages/ffi_url_launcher', repo: 'https://github.com/kihyun1998/ffi_url_launcher' },
  { name: 'just_sonner', ecosystem: 'Flutter', href: 'https://pub.dev/packages/just_sonner', repo: 'https://github.com/kihyun1998/just_sonner' },
  { name: 'flutter_syntax_highlight', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_syntax_highlight', repo: 'https://github.com/kihyun1998/flutter_syntax_highlight' },
  { name: 'flutter_example_template', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_example_template', repo: 'https://github.com/kihyun1998/flutter_example_template' },
  { name: 'flutter_smooth_wheel_scroll', ecosystem: 'Flutter', href: 'https://pub.dev/packages/flutter_smooth_wheel_scroll', repo: 'https://github.com/kihyun1998/flutter_smooth_wheel_scroll' },

  // Rust — crates.io
  { name: 'justpdf', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf', repo: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justpdf-core', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-core', repo: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justpdf-render', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-render', repo: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justpdf-formats', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-formats', repo: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justpdf-special', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-special', repo: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justpdf-ffi', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-ffi', repo: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justpdf-cli', ecosystem: 'Rust', href: 'https://crates.io/crates/justpdf-cli', repo: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justbig2', ecosystem: 'Rust', href: 'https://crates.io/crates/justbig2', repo: 'https://github.com/kihyun1998/justbig2' },
  { name: 'justjp2', ecosystem: 'Rust', href: 'https://crates.io/crates/justjp2', repo: 'https://github.com/kihyun1998/justjp2' },
  { name: 'justerm-core', ecosystem: 'Rust', href: 'https://crates.io/crates/justerm-core', repo: 'https://github.com/kihyun1998/justerm' },
  { name: 'justsftp', ecosystem: 'Rust', href: 'https://crates.io/crates/justsftp', repo: 'https://github.com/kihyun1998/justsftp' },

  // npm
  { name: 'justpdf-compress-wasm', ecosystem: 'npm', href: 'https://www.npmjs.com/package/@kihyun1998/justpdf-compress-wasm', repo: 'https://github.com/kihyun1998/justpdf' },
  { name: 'justerm-web', ecosystem: 'npm', href: 'https://www.npmjs.com/package/justerm-web', repo: 'https://github.com/kihyun1998/justerm' },
  { name: 'justerm-renderer', ecosystem: 'npm', href: 'https://www.npmjs.com/package/justerm-renderer', repo: 'https://github.com/kihyun1998/justerm' },
  { name: 'justerm-wasm-decode', ecosystem: 'npm', href: 'https://www.npmjs.com/package/justerm-wasm-decode', repo: 'https://github.com/kihyun1998/justerm' },
  { name: 'justable', ecosystem: 'npm', href: 'https://www.npmjs.com/package/@kihyun1998/justable', repo: 'https://github.com/kihyun1998/justable' },
];

export const families: Family[] = [
  {
    slug: 'justpdf',
    name: 'justpdf',
    // The library first, then its sub-crates, the CLI, the codecs it
    // consumes, and the wasm build. A Family named after its flagship
    // Package is fine — see docs/adr/0007-package-families.md.
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
    // Entry point first, then its consumers.
    members: ['justerm-core', 'justerm-web', 'justerm-renderer', 'justerm-wasm-decode'],
  },
];

// One row of the Open Source list: either a standalone Package or a Family
// standing in for its members.
export type PackageRow = Package & { kind: 'package' };

export type FamilyRow = {
  kind: 'family';
  slug: string;
  name: string;
  // Internal, unlike a Package row — a Family has no registry page.
  href: string;
  memberCount: number;
};

export type OpenSourceRow = PackageRow | FamilyRow;

export type ResolvedFamily = {
  slug: string;
  name: string;
  members: Package[];
};

const URL_SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function indexByName(allPackages: Package[]): Map<string, Package> {
  return new Map(allPackages.map((entry) => [entry.name, entry]));
}

// Resolving a Family's members is also how membership is checked: a name that
// isn't in the catalogue has nothing to resolve to. Keeping the two together
// means there is one lookup, and one error, rather than a validation pass and a
// resolution pass that can disagree.
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

// Curation mistakes are invisible in the arrays above and would ship as a
// silently wrong list, so they throw. `openSourceRows` is derived at module
// load and every page imports it, which makes these build-time failures.
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

// A Family appears where curation put its first member and its members drop out
// of the flat list, so declared order still governs everything. A Family
// therefore outranks the Ecosystem clustering it sits inside — see
// docs/adr/0007-package-families.md.
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
    rows.push({
      kind: 'family',
      slug: family.slug,
      name: family.name,
      href: `/open-source/${family.slug}`,
      memberCount: family.members.length,
    });
  }

  return rows;
}

// The list every Open Source surface renders. Derived once, at module load.
export const openSourceRows: OpenSourceRow[] = deriveOpenSourceRows();

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
