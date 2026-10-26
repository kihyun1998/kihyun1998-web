---
name: adr-0009-package-rows-link-registry-and-repo
status: accepted
amends: ADR-0006 — the registry stays a destination, but no longer the only one
---

# Package rows link to both the registry and the GitHub repo

ADR-0006 gave a Package row exactly one destination, its registry page, and left GitHub repos unlinked — partly because deriving a repo URL from the package name would be a guess.

**Decision:** A Package row carries **two icon links**: the registry (pub.dev / crates.io / npm) and the GitHub repository. The package name is plain text, no longer a link.

**Why:**

- A visitor reading code, filing an issue, or checking activity wants the repo, and the registry page is one extra hop from it.
- ADR-0006's objection was to *guessing* repo URLs, not to linking them. Each Package now declares `repo` explicitly; nothing is derived from `name`. That matters: packages in a monorepo (every `justpdf-*` and `justerm-*` package) share one repository whose name is not theirs. The URLs were taken from each registry's own `repository` field.
- Two destinations of equal weight means neither should own the name. Making the name link to one of them hides the other behind an icon that reads as secondary.

**Alternatives prototyped:** keeping the name as the registry link with a trailing GitHub icon, and replacing the Ecosystem tag with labelled `pub.dev` / `GitHub` chips. Both lost to the two-icon row.

**Consequences:**

- `Package` in `src/lib/open-source.ts` gains a required `repo`.
- A Package row is two focusable targets instead of one. The Ecosystem tag stays beside the icons and still names the registry; the registry icon itself is the same generic package glyph for all three ecosystems.
- Family rows and Project rows are unchanged — each still has one destination.
