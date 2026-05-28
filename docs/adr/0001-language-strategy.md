---
name: adr-0001-language-strategy
status: accepted
---

# English-base bilingual with narrow translatable scope

The author is Korean; the audience for the open-source work this site advertises is global. Pure English would erase a cultural authenticity signal that matters to the author; pure bilingual with two equal languages decays into a stale "ghost town" on whichever side gets less love.

**Decision:** English is the canonical language of the entire site. A lightweight i18n mechanism exists: a language toggle in the UI, persisted via `localStorage`. No URL routing (no `/ko` route), no `Accept-Language` detection, no server-side locale negotiation — the toggle reads localStorage on mount and re-renders translated blocks on toggle.

The toggle only affects **Translatable Content** — currently just the **Identity Statement** at the top of the home page. Everything else is English-only and does not respond to the toggle:

- Navigation labels (`About`, `Blog`, `Projects`)
- Project names and one-line descriptions
- Ecosystem tags (`Flutter`, `TypeScript`, `Rust`)
- Page bodies for future pages such as `/about` — these stay English-only by default
- Footer text
- Page titles and meta tags

Adding a new surface to Translatable Content requires explicit decision and an update to [[context]]; the default for any new text is English-only.

**Considered and rejected:**

- *English only* — loses the cultural authenticity signal; site reads as language-neutral when the author is not.
- *Pure bilingual (every surface in two languages)* — forces every micro-copy change to ship twice forever; in practice one side rots within months and the rot is visible to visitors.
- *Stacked rendering (both languages shown simultaneously, no toggle)* — simpler but doubles the height of every translated block and signals "this site is bilingual everywhere" when it isn't.
- *URL routing (`/ko` route)* — premature; we have a single translated block, not a multi-page bilingual site.

**Consequences:** The toggle exists today even though only one block flips. This is intentional — having the infrastructure ready means future additions to **Translatable Content** require zero new plumbing, only the addition of a Korean translation string. The `Translatable Content` definition in [[context]] is the gate that prevents the toggle's existence from quietly absorbing every new text surface.
