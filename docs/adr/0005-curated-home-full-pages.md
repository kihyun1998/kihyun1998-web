---
name: adr-0005-curated-home-full-pages
status: accepted
---

# Home is curated and capped; overflow lives on dedicated full-list pages

Kihyun has many Packages (dozens of Flutter plugins alone). Rendering all of them on the home page would make the "Open Source" section scroll endlessly and push "Projects" far below the fold.

**Decision:** The home page shows at most `HOME_LIMIT` (currently 6) items per section. When a section has more than that, a "See all →" link appears below it, pointing to a dedicated full-list page: `/open-source` and `/projects`. Those pages render the *entire curated array* (not every GitHub repo) using the same list components.

This follows the paco.me / leerob.com pattern (curated home + a "see all" page) rather than rauchg.com (everything on one page), because Kihyun's catalogue is large enough that an uncapped home would bury the second section.

**Consequences:**

- "See all →" renders only when a section is actually truncated; at ≤ `HOME_LIMIT` items the home page is the complete list and no link shows (though the `/open-source` and `/projects` routes still exist and work).
- The full-list pages are still bounded by curation — they show the hand-picked arrays in `src/lib/`, not the raw GitHub account. "See all" does not mean "see literally everything I've ever pushed."
- Header, footer, and the page container live in `layout.tsx`, so all three pages share one shell and the language/theme toggles persist across navigation.
- If a richer per-item view is ever wanted (a page per Package/Project), it slots in beneath these list pages without disturbing the home cap.
