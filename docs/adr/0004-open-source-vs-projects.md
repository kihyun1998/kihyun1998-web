---
name: adr-0004-open-source-vs-projects
status: accepted
supersedes: corrects the "Project = open-source software" definition from the first design grill
---

# Open Source and Projects are two separate categories

The first design grill collapsed everything Kihyun makes into a single concept ("Project = a piece of open-source software") shown in one "Open Source" list. Looking at his actual GitHub (103 repos) showed that conflation was wrong: he authors two genuinely different kinds of things.

**Decision:** Split the work into two categories, shown as two separate page sections.

- **Package** (section "Open Source") — a reusable library, plugin, or crate that another developer *installs and builds on top of*: `flutter_table_plus`, `just_color_picker`, `justpdf`, `justjp2`, etc. Its value is in being a building block.
- **Project** (section "Projects") — a standalone *service* or application that a person *uses directly*: a web service, a browser extension (`youtube-comment-exporter`), a tool (`video-to-subtitle`). Its value is in being run, not built upon. Conceptually a "service"; the display label is "Projects" because that reads better to visitors.

The dividing axis is **build-upon vs. use-directly**, not "open source vs. closed" — the Projects are also public repos. "Open Source" is just the most natural section label for the building-block category.

**Consequences:**

- The home page has two sections (Open Source, then Projects), not one.
- ADR-0003 ("card shows only name + Ecosystem") is scoped to **Package** cards. **Project** cards currently show only a name; their metadata is deliberately left undecided for now.
- Forks (`flutter`, `impeccable`, `mattpocock-skills`, `github-readme-stats`) belong in neither category — they are not authored work.
- Data for the two categories lives in two separate typed files (`src/lib/open-source.ts`, `src/lib/projects.ts`), each a hand-curated array. Real curation and Project metadata are deferred to a later decision.
