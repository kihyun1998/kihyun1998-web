---
name: adr-0003-minimal-project-card
status: accepted
---

> **Terminology note:** This ADR predates [[adr-0004-open-source-vs-projects]], which split "Project" into **Package** (Open Source) and **Project** (services). Everywhere below, "Project card" means **Package card** — the items in the Open Source section.

# Package card shows only name and Ecosystem

Every reference site we looked at (paco.me, leerob.com, rauchg.com) carries a one-line description per Project. We chose to omit that field entirely.

**Decision:** A Project card displays only the project's name and its **Ecosystem** tag. No inline description. Visitors who want to know what a Project does click through to its repository, where the README serves as the description.

**Reasoning:**

- **Names should self-describe.** When choosing a project name, prefer one that signals purpose (`flutter-resizable-widgets`) over a clever code word (`nimbus`). If a name fails this test, the fix is to rename the project, not to band-aid it with a description.
- **Dead text is anti-minimal.** A description field forces every card to fill its visual space whether the description adds information or not. The first three obligatory descriptions read informatively; the next ten read as padding.
- **No translation burden.** Descriptions would be English-only per [[adr-0001-language-strategy]], but their presence would still raise pressure to translate them. Removing the field removes the pressure.

**Considered and rejected:**

- *Mandatory one-line description per Project* — the reference pattern; rejected because it produces padding text for self-describing names and adds permanent maintenance load.
- *Optional description* — allowed only on Projects whose names need it; rejected because variable card heights break the visual cadence of the list and reintroduce the "should I write one?" decision on every new Project.

**Consequences:** SEO for the Open Source section relies on project names and Ecosystem tags only — visitors arriving via search will see the list, not search-indexed prose about each project. If discoverability becomes a real problem later, the answer is *not* to add a description column; it is to invest in the project READMEs and/or add separate per-Project pages with richer content. The card itself stays minimal.
