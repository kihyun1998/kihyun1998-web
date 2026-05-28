# kihyun1998.com

A personal site for Ki Hyun Park. Acts as a public index pointing to his blog (hosted elsewhere) and his open-source work.

## Language

**Blog**:
A personal writing destination hosted *outside* this site. kihyun1998.com references it via a single outbound link; it does not host or render blog posts.
_Avoid_: writing, posts, journal (all imply content lives here)

**Project**:
A piece of open-source software authored by Kihyun and worth showing publicly. The list is *hand-curated* (not auto-pulled from GitHub) — only things he wants visitors to see. Spans multiple ecosystems (Flutter, npm, Rust, etc.); a Project is defined by its identity, not its language.
_Avoid_: repo (a Project may live across multiple repos), package (not every Project is published to a registry yet), library (too narrow — some Projects are apps or CLIs)

**Ecosystem**:
A short tag (e.g. `Flutter`, `TypeScript`, `Rust`) that signals the runtime/framework context of a Project to a browsing developer. Chosen for *informativeness* over consistency — pick the tag that most quickly tells a passing developer "this is relevant to me." It is metadata on a Project, not a grouping mechanism unless explicitly chosen to be.
_Avoid_: language (overlaps but isn't the same — "Flutter" is more useful than "Dart"), stack, tech

**Identity Statement**:
A one-to-three-sentence prose introduction at the top of the home page describing who Kihyun is. It is currently the only member of **Translatable Content** — the only surface that flips when the **Language Toggle** is changed.

**Constraints:**
- The Identity Statement does *not* name specific **Ecosystem**s (Flutter, TypeScript, Rust). Those facts live in the Project list, where each card carries its Ecosystem tag. The Identity Statement is about *who* Kihyun is, not *what tools* he uses. Future edits that try to inline ecosystem names should be reverted; if you want to surface the cross-ecosystem fact more loudly, change the Project list, not the Identity Statement.
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
- Each **Project** has at least one source repository and *optionally* one or more registry listings (pub.dev for Flutter, npm for JS/TS, crates.io for Rust). The site treats the registry listing as secondary metadata, not as the Project's identity.
- Each **Project** has exactly one **canonical destination** — its primary GitHub repository — which is where a card click goes. Registry pages are intentionally not linked from card-level UI; visitors who want to install find that information in the project's README.
- Each **Project** card displays exactly two pieces of data: its name and its **Ecosystem** tag. No description, no year, no star count, no status indicator. See [[adr-0003-minimal-project-card]].
- The **Project** list lives in a single page section labeled "Open Source." Items are ordered by curation (most-promoted first) within natural **Ecosystem** clusters — no explicit section headers per Ecosystem; the clustering emerges from sort order.
- The site has one primary page (the home). It holds two regions: a brief identity statement at the top, and a single list of **Projects** below. **Blog** appears only as one outbound link in the nav area — it is not a section of its own.
- The nav area holds exactly two outbound links — **Blog** (`https://blog.kihyun1998.com`) and GitHub profile (`https://github.com/kihyun1998`) — plus the **Language Toggle** and a theme toggle. No Twitter, LinkedIn, or email link; anyone needing contact finds it on the GitHub profile.

## Flagged ambiguities

(none yet)
