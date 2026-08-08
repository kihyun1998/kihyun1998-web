# kihyun1998.com

A personal site for Ki Hyun Park. Acts as a public index pointing to his blog (hosted elsewhere) and his open-source work.

## Language

**Blog**:
A personal writing destination hosted *outside* this site. kihyun1998.com references it via a single outbound link; it does not host or render blog posts.
_Avoid_: writing, posts, journal (all imply content lives here)

**Package**:
A reusable open-source library, plugin, or crate authored by Kihyun — something another developer *installs and builds on top of* (via pub.dev, crates.io, npm, etc.). Its value is in being a building block. Shown in the "Open Source" section. Hand-curated, not auto-pulled from GitHub. See [[adr-0004-open-source-vs-projects]].
_Avoid_: repo (a Package may span multiple repos), library (too narrow — some are plugins or codecs), project (a Package is NOT a Project — see below)

**Project**:
A standalone service or application authored by Kihyun that a person *uses directly* — not a building block, but a finished thing you run (a web service, a browser extension, a tool). Conceptually a "service"; displayed under the label "Projects". Hand-curated. See [[adr-0004-open-source-vs-projects]].
_Avoid_: package/library (those are the building-block category, i.e. **Package**), app (too narrow — some are services, not apps)

**Ecosystem**:
A short tag (`Flutter`, `Rust`, `npm`) that signals the runtime/registry context of a **Package** to a browsing developer. Chosen for *informativeness* over consistency — pick the tag that most quickly tells a passing developer "this is relevant to me" (it doubles as a hint of which registry the card links to). It is metadata on a Package. (Projects do not currently carry an Ecosystem tag — their metadata is deferred.)
_Avoid_: language (overlaps but isn't the same — "Flutter" is more useful than "Dart"), stack, tech

**Identity Statement**:
A one-to-three-sentence prose introduction at the top of the home page describing who Kihyun is. It is currently the only member of **Translatable Content** — the only surface that flips when the **Language Toggle** is changed.

**Constraints:**
- The Identity Statement does *not* name specific **Ecosystem**s (Flutter, TypeScript, Rust). Those facts live in the Open Source list, where each **Package** carries its Ecosystem tag. The Identity Statement is about *who* Kihyun is, not *what tools* he uses. Future edits that try to inline ecosystem names should be reverted; if you want to surface the cross-ecosystem fact more loudly, change the Open Source list, not the Identity Statement.
- The Identity Statement is short by design — currently a single sentence, with a soft ceiling of three. Length growth should be challenged: if a new fact wants to be added, prefer adding it to a Project card or removing an existing fact to keep the total compact.
- The literal text lives in `src/app/page.tsx`, not in this glossary. This file describes the *role* and *constraints* of the Identity Statement, not its current wording.
_Avoid_: bio, headline, tagline (these imply other forms; this one has a specific structural role)

**Translatable Content**:
The closed set of prose surfaces that have a Korean translation alongside their English source. Currently contains only the **Identity Statement**. Adding a new member requires explicit decision (the default for any new text is English-only). The **Language Toggle** affects exactly these surfaces and nothing else.
_Avoid_: localized content (too broad), translations (a property, not a category)

**Language Toggle**:
A UI control that switches **Translatable Content** between English and Korean. Persisted in `localStorage`; no URL routing, no server-side locale negotiation, no `Accept-Language` detection. On first visit, defaults to English. See [[adr-0001-language-strategy]].
_Avoid_: locale switcher, language picker, i18n (all imply heavier infrastructure than exists)

**English-base bilingual**:
This site's localization model: English is the canonical source-of-truth; a narrow **Translatable Content** set has Korean translations swappable via the **Language Toggle**; everything outside that set is English-only and unaffected by the toggle. Korean translations may lag English without consequence — English is always the fallback.
_Avoid_: i18n (too generic), multilingual (implies parity that does not exist)

## Relationships

- This site points to **Blog** via a single outbound link. There is no content sync, no RSS aggregation, no post preview, no MDX.
- A **Package** and a **Project** are different things (building block vs. finished service). They are shown in two separate page sections: "Open Source" (Packages) and "Projects". See [[adr-0004-open-source-vs-projects]].
- Each **Package** has exactly one **canonical destination** — its registry page (pub.dev for Flutter, crates.io for Rust, npm for npm) — which is where a card click goes. The registry page carries install info, rendered docs, and version. GitHub repos are not linked from card-level UI. See [[adr-0006-link-packages-to-registry]].
- Each **Package** card displays exactly two pieces of data: its name and its **Ecosystem** tag. No description, no year, no star count, no status indicator. See [[adr-0003-minimal-project-card]].
- The "Open Source" list orders **Package**s by curation (most-promoted first) within natural **Ecosystem** clusters — no explicit per-Ecosystem headers; the clustering emerges from sort order.
- Each **Project** card displays just its name, linking to its **canonical destination** — the live service URL (e.g. Just MLB → `https://mlb.kihyun1998.com/`). A "kind" label (e.g. "Web App") remains deferred; not shown for now.
- The home page shows a *curated, capped* subset of each section (currently up to 6). Each section always carries a "See all" link to its full-list page (`/open-source`, `/projects`), which renders the entire curated array — not the raw GitHub account. The link shows even when nothing is truncated, so neither full-list page is ever orphaned from the internal link graph. See [[adr-0005-curated-home-full-pages]].
- The home page is: a brief identity statement at the top, then the "Open Source" section, then the "Projects" section. **Blog** appears only as one outbound link in the nav area — it is not a section of its own.
- The nav area holds exactly two outbound links — **Blog** (`https://blog.kihyun1998.com`) and GitHub profile (`https://github.com/kihyun1998`) — plus the **Language Toggle** and a theme toggle. No Twitter, LinkedIn, or email link; anyone needing contact finds it on the GitHub profile.

## Flagged ambiguities

(none yet)
