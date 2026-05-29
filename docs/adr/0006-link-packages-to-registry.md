---
name: adr-0006-link-packages-to-registry
status: accepted
supersedes: reverses the "card links to GitHub repo, not the registry" decision in ADR-0004 / the first grill
---

# Package cards link to the registry, not the GitHub repo

ADR-0004 (and the first grill) said a Package card's canonical destination is its GitHub repository, with registry pages deliberately not linked. That was decided against placeholder data. The real catalogue — taken from Kihyun's profile README — changed the calculus.

**Decision:** A Package card links to its **registry page**: pub.dev for Flutter, crates.io for Rust, npm for npm packages.

**Why the reversal:**

- Every Package is actually published to a registry. The registry page is where install instructions, rendered documentation, and the current version live — exactly what a developer who found the package wants.
- The README curates registry links, not repo links, so the registry URLs are authoritative and verified; deriving GitHub repo URLs would mean guessing that every repo name equals its package name (it doesn't always).
- The **Ecosystem** tag already on each card (`Flutter` / `Rust` / `npm`) tells the visitor which registry they're about to land on, so the destination isn't surprising.

**Consequences:**

- The `href` in `src/lib/open-source.ts` is a registry URL.
- ADR-0003 (cards show only name + Ecosystem, no description) is unaffected — this only changes where the click goes.
- **Project** cards (services) are a different category and keep their own destination rules; this ADR is about **Package** cards only.
