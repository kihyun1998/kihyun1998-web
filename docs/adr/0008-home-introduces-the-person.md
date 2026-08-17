---
name: adr-0008-home-introduces-the-person
status: accepted
---

# The home page introduces the person, and only Projects carry descriptions

The home page was a flat stack of near-identical rows. A visitor read one abstract sentence — "I'm a developer interested in defining problems and solving them" — and then met twelve links of uniform weight. Three things were wrong at once, and they share a fix.

**The site's organising idea was invisible.** [[adr-0004-open-source-vs-projects]] made **Package** versus **Project** — build-upon versus use-directly — the distinction the whole site is arranged around. On screen both sections rendered as a `text-sm text-muted-foreground` heading over identical rows: the headings were *quieter and smaller than their own content*, and nothing anywhere said what either category meant.

**A Project told the visitor nothing.** A **Project** row showed a bare name. [[adr-0003-minimal-project-card]]'s argument — that a good name self-describes, and a description that adds nothing is padding — holds for `flutter_table_plus`. It does not hold for `Pricly` or `Just Roster`.

**The person was barely on the page.** The **Identity Statement** was using one of the three sentences its own constraint allows, and it says something true of most developers.

## Decisions

**1. The home page's first job is to introduce the person, not the catalogue.** The list is evidence for a claim the page has to make first. In practice this means the **Identity Statement** is expected to use the headroom it already has, and the sections below it are framed rather than dumped.

**2. Each section carries a Section Lede** — one English line under the heading saying what the category is. The wording is lifted from the definitions already in `CONTEXT.md`, so the site and the glossary say the same thing in the same words. A lede is *not* **Translatable Content**; per [[adr-0001-language-strategy]] the default for new text is English-only, and nothing here changes that.

**3. Section headings outrank their rows.** The heading is set stronger than the content beneath it, the lede sits under it in muted text, and every section after the first is preceded by a rule. The break is drawn with spacing and the existing border token — no new colour, no card, no container, no motion, and no third font ([[adr-0002-typography-pretendard-inter]] stands).

**4. A Project may carry a one-line description; a Package may not.** This does not reverse ADR-0003. That ADR is explicitly scoped to **Package** cards, and ADR-0004 left Project metadata undecided; this closes that gap. The asymmetry is the decision, and it has a reason: a **Package** name is chosen to describe what it does and arrives with an **Ecosystem** tag for context, while a **Project** name is a product name and arrives with nothing.

The description is **optional** and bounded — a short clause, no closing full stop, length-capped, validated at build time. Where a name already says enough, the right move is to omit it, not to invent prose. A **Package** row is unchanged: name and **Ecosystem**, nothing more.

**5. The wordmark is each page's `h1`.** Sections are `h2` beneath it, and a section is labelled by its heading for assistive technology, so the document outline matches the visible hierarchy.

## Considered and rejected

- *An `/about` page.* Person-first is served by the surface that already exists and is already translated. A new route drags its own questions — is it Translatable Content, does the nav change, what does it contain — and those should not ride inside a hierarchy pass. **This remains the right follow-up**, and the trigger is specific: if the Identity Statement wants a fourth sentence, build `/about` rather than raise the ceiling.
- *Descriptions on Package rows too.* Would turn a 27-row list into 27 lines of obligatory prose — precisely the failure ADR-0003 predicted.
- *Making the ledes Translatable Content.* Two more strings to keep in sync forever, for text a visitor reads once.
- *Cards, colour, or motion to separate the sections.* The problem was hierarchy, not decoration; typography and spacing solve it without touching the palette.

## Consequences

- The section primitives carry the heading, lede, and boundary, so `/open-source` and `/projects` inherit the treatment rather than reimplementing it. A third section needs no new component.
- The lede text lives beside the data it describes, in `src/lib/`, so renaming a category touches one place.
- Project descriptions ship **empty**. They are Kihyun's words about his own services, and a generated description would read worse than none. The mechanism is in place; the copy is a separate, human step — as is the expanded Identity Statement.
- The shell's top padding is reduced so a phone's first viewport carries the statement and the whole first section rather than the header and whitespace.
- `CONTEXT.md` gains a **Section Lede** entry so the concept is not reinvented as "subtitle" or "blurb".
