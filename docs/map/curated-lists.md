# Curated lists

The Open Source and Projects lists: the hand-kept arrays in `src/lib/open-source.ts` and `src/lib/projects.ts`, the rows derived from them, the pages that show them (`src/app/page.tsx`, `src/app/open-source/`, `src/app/projects/page.tsx`), the list components (`src/components/lists.tsx`, `open-source-row.tsx`, `open-source-list.tsx`) and the sitemap (`src/app/sitemap.ts`). The terms are in `GLOSSARY.md` (Package, Family, Ecosystem, Dependency, Example Dependency, Project, Section Lede); the decisions are ADR-0003 to ADR-0010. This note holds what those do not.

## Where the catalogue comes from

- **The source of truth for `packages` is Kihyun's GitHub profile README**, the curated list he keeps. The order of `packages` mirrors that README: the Flutter cluster, then Rust, then npm. Order is curation and is never sorted.
- **`repo` is written out, never derived from `name`.** Packages in one monorepo (`justpdf-*`, `justerm-*`) share a repository whose name is not theirs (ADR-0009).
- **`uses` and `exampleUses` hold only Kihyun's own Packages.** pub.dev shows a Package's own pubspec only, so `exampleUses` was read from `example/pubspec.yaml` in each repository. Both feed the Dependency Map and nothing else; no row shows them.
- **A Family's `members` are in reading order, entry point first.** `justpdf`: the library, its sub-crates, the CLI, the codecs it consumes (`justbig2`, `justjp2`), then the wasm build. `justerm`: `justerm-core`, then its consumers. A Family named after its flagship Package is normal (ADR-0007).
- **The Section Ledes `openSourceLede` and `projectsLede` are lifted from `GLOSSARY.md`'s definitions** of Package and Project, so the site and the glossary say the same thing in the same words. They are English-only (ADR-0001).

## Mistakes throw at module load, which is build time

The arrays are typed by hand, and a curation mistake in them would ship as a silently wrong list. So every check throws, and since `openSourceRows`, `dependencyGraph` and `projects` are derived at module load and every page imports them, a mistake fails `next build`.

- **`resolveMembers` is both the membership check and the lookup.** A member name not in `packages` has nothing to resolve to, so there is one lookup and one error, rather than a validation pass and a resolution pass that could disagree. `assertFamiliesAreWellFormed` and `resolveFamily` both go through it.
- **`RESERVED_SLUGS` holds the fixed routes under `/open-source/` that a Family page would shadow**: `dependencies`, the Dependency Map. `src/app/open-source/dependencies/page.tsx` is a static segment, so Next.js routes it ahead of `/open-source/[family]`.
- **`deriveDependencyGraph` throws on a wrong name for the same reason as Family membership**: it would silently drop an edge from the map. The other throws are listed in ADR-0010's consequences.
- **`validateProjects` holds a Project's optional `description` to a short clause**: not blank (omit the field instead), at most `DESCRIPTION_MAX_LENGTH` (60) characters, and no closing `.`, `!` or `?`. 60 was chosen as long enough for "Turns a roster spreadsheet into a lineup" and short enough that rows keep an even rhythm. It is exported so the tests drive it with fixtures.
- **No Project carries a description yet, on purpose.** They are Kihyun's words about his own services, and an invented one reads worse than none. A Project without one renders exactly as before the field existed.
- **The tests drive every failure case with fixtures**, so the real arrays are never mutated, and they assert on what a visitor sees (the sequence of rows, their kinds, names and meta), not on how the grouping is computed. The `open-source.test.ts` fixture catalogue has the real one's shape: an Ecosystem cluster, then a Family that straddles two Ecosystems, then loose Packages.

## Rows

- **A Family row stands at its first member's place in `packages`, and its members drop out of the flat list** (`deriveOpenSourceRows`), so declared order still governs everything (ADR-0007).
- **A Family row's `ecosystems` are every Ecosystem its members span, in order of first appearance in `packages`.** Its `href` is `/open-source/<slug>`, a page on this site, since a Family has no registry page.
- **One component, `OpenSourceRow`, renders a row on the home page and on `/open-source`**, so a Family looks the same in both: collapsed, never expanded inline.
- **A Package row is plain text with two icon links** (registry and repository); the Ecosystem tag beside them says which registry the package icon opens, and the icon is the same for all three (ADR-0009).
- **`RowContent` is shared by `LinkRow` and `InternalLinkRow`**, so the list reads as one list wherever a row leads. A Project's `description` sits under its name inside the same link, so a row stays one focusable target.
- **A Family page lists its members as ordinary Package rows and nothing else** (ADR-0003 one level up, ADR-0007). Every Family page is generated at build time from `families`; an unknown slug is a 404 (`dynamicParams = false`), not a page rendered on demand.
- **`BackLink` on a Family page and the Dependency Map link on `/open-source` are styled like "See all →"**, so the navigational links in the Open Source area match. The Dependency Map is linked from the `/open-source` heading and from nowhere else.

## The lists' pages

- **The home page shows `HOME_LIMIT` (6) rows of each list, and counts derived rows**, so a Family costs one slot whatever its size (ADR-0005, ADR-0007). Each capped section links to its full-list page whether or not it overflows (ADR-0005).
- **`/open-source` pages its rows, `OPEN_SOURCE_PAGE_SIZE` (15) to a page, a Family counting as one row as on the home page.**
- **`viewOpenSourceList` never throws, because its query comes straight from the URL.** An unknown `eco` is All, a page number outside the range is clamped, and a filter narrows the list without reordering it. A Family sits under every Ecosystem its members span.
- **`?eco=&page=` picks the view in the browser** (`OpenSourceList`), so `/open-source` stays prerendered; the prerendered HTML is All, page 1.
- **The sitemap's Family entries come from the same `families` array the pages render**, so a new Family cannot ship without entering the sitemap. The rest are the four fixed pages.

## The section layout

- **A section heading is stronger than its rows** (`SectionHeading`). The site's structure, Packages here and Projects there, is its organising idea (ADR-0004), and it used to render quieter than its own content (ADR-0008).
- **A bordered section splits its gap either side of the rule**: `mt-12 border-t pt-12` in place of the base `mt-16`, which would stack margin and padding into a gap twice any other on the page. `bordered` is set on every section after the first.
