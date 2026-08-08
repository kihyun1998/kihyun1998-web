---
name: adr-0005-curated-home-full-pages
status: accepted
---

# Home is curated and capped; overflow lives on dedicated full-list pages

Kihyun has many Packages (dozens of Flutter plugins alone). Rendering all of them on the home page would make the "Open Source" section scroll endlessly and push "Projects" far below the fold.

**Decision:** The home page shows at most `HOME_LIMIT` (currently 6) items per section. Below each section a "See all →" link points to a dedicated full-list page: `/open-source` and `/projects`. Those pages render the *entire curated array* (not every GitHub repo) using the same list components.

This follows the paco.me / leerob.com pattern (curated home + a "see all" page) rather than rauchg.com (everything on one page), because Kihyun's catalogue is large enough that an uncapped home would bury the second section.

**Consequences:**

- "See all →" renders *unconditionally*, even when a section is not truncated and the link therefore leads to the same items the home page already shows. This is deliberate: the original rule ("show it only on overflow") left `/projects` with zero inbound internal links when `projects` held exactly `HOME_LIMIT` items, and Google reported it as "Crawled — currently not indexed." A route that exists must be reachable from the link graph. Revisit only if a section's full-list page is removed outright.
- The full-list pages are still bounded by curation — they show the hand-picked arrays in `src/lib/`, not the raw GitHub account. "See all" does not mean "see literally everything I've ever pushed."
- Header, footer, and the page container live in `layout.tsx`, so all three pages share one shell and the language/theme toggles persist across navigation.
- If a richer per-item view is ever wanted (a page per Package/Project), it slots in beneath these list pages without disturbing the home cap.
