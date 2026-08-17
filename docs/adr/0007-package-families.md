---
name: adr-0007-package-families
status: accepted
---

# A Family groups Packages, outranks Ecosystem clustering, and points inward

The Open Source list treated every **Package** as an independent, equal item. `justerm-core`, `justerm-web`, `justerm-renderer`, and `justerm-wasm-decode` are one body of work — a terminal emulator, its Rust core and its npm consumers — but the list scattered them across two **Ecosystem** clusters with unrelated packages between them. The relationship was invisible, and four rows of one thing crowded out genuinely distinct work under the home page's cap.

**Decision:** Introduce **Family** — a named group of Packages built to be used together — as a layer between "the whole list" and "one Package".

Three sub-decisions follow from that, each reversing a rule that was previously binding.

## A Family renders as one collapsed row

A Family occupies a single row showing its name and its member count (`justerm — 4 packages`). Its members do not also appear as standalone rows. This holds on the home page *and* on `/open-source`: "See all" means "all rows", not "expand the Families". The Family's own page is the only place members are enumerated.

The member count sits in the same trailing slot a Package row uses for its Ecosystem tag. A Family gets no Ecosystem tag — it may span several, and picking one would mislead.

[[adr-0003-minimal-project-card]] still holds one level up: a Family page lists members and nothing else. No Family blurb, no per-member description. The reasoning there — obligatory descriptions become padding, and dead text is anti-minimal — applies unchanged.

Because the home cap counts *rows*, a Family costs one of the six slots regardless of size. That is the point: the cap should spend its budget on distinct bodies of work.

## A Family outranks Ecosystem clustering

Previously the Open Source list's clusters emerged from Ecosystem sort order (Flutter, then Rust, then npm) with no explicit headers. `justerm` spans Rust and npm and cannot live inside either without splitting, so a Family now forms its own cluster.

**Where** that cluster sits is still curation, not computation: a Family renders at the position its *earliest member* holds in `packages`, and its members drop out of the flat list. So `justerm` appears where `justerm-core` used to, at the tail of the Rust cluster. Moving a Family means moving its members — the order of `packages` remains the single ordering mechanism, mirroring the profile README.

Note what this does *not* do on its own: a Family is promoted onto the capped home page only if its earliest member was already near the top of `packages`. `justerm` is not, so introducing it changed the home page's six rows by nothing. Freeing home-page slots is a *curation* act — hoisting members — that this decision enables rather than performs.

**Considered and rejected:** *a separate ordering field on the Family* — rejected because it creates a second place where order lives, and the two can disagree. *Sorting Families first, or by member count* — rejected for the same reason ADR-0003 rejected descriptions: it replaces a curator's judgement with a rule that will be wrong at some point and cannot be overridden.

## A Family's canonical destination is a page on this site

[[adr-0006-link-packages-to-registry]] says a Package's canonical destination is its registry page, because that is where install instructions, docs, and version live. A Family has no registry page. Its canonical destination is `/open-source/<slug>` — an internal route, statically generated, one per Family.

This is an exception carved into ADR-0006, not a reversal of it: **Package** rows still link to registries everywhere they appear, including on Family pages. Only the Family row itself points inward, and it is visually the only row on the list that does.

The Family page carries a back-link to `/open-source`, and Family routes are appended to the sitemap from the same array the pages render. Both exist for the reason [[adr-0005-curated-home-full-pages]] gives: a route that exists must be reachable from the link graph, or Google reports it as "Crawled — currently not indexed."

## Consequences

- **Membership is declared, never inferred.** A prefix heuristic on `just*` would sweep in `justpdf`, `just_color_picker`, and `just_tooltip`, which share a naming habit and nothing else.
- **A Package belongs to at most one Family**, and is still declared exactly once in `packages` with its Ecosystem and registry URL. A Family references members by name; nothing is duplicated.
- **Curation mistakes throw at build time.** A member name absent from `packages`, a Package claimed twice, a Family of fewer than two, a duplicate or non-URL-safe slug — each fails `next build` rather than silently dropping a package from the site. These errors are invisible in the data arrays, which is exactly why they cannot be left to review.
- **The list became computed.** Grouping is the first behaviour in this repo derived rather than typed out, which is why a test runner arrived with it. Tests cover the derivation in `src/lib/` only; pages and components stay untested, where a type error or a failed build is the honest signal.
- **One level, no nesting.** A Family contains Packages, never other Families.
- **Family names and member counts are English-only**, like every other Open Source surface. **Translatable Content** does not grow.
- `justerm` ships as the first Family. Whether the `justpdf` cluster becomes a second is curation, not mechanism — `justbig2` and `justjp2` are standalone codecs that `justpdf` consumes, and may be worth more as independently discoverable rows. Note that a Family named after its flagship package (`justpdf`) would list a member of the same name; that is normal, not a bug to fix.
