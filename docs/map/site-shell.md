# Site shell

What every page shares: the root layout (`src/app/layout.tsx`), the header and its nav area (`site-header.tsx`, `home-nav.tsx`), the footer, the theme and the language (`src/lib/theme.ts`, `theme-toggle.tsx`, `language.tsx`, `src/lib/i18n.ts`), the home page's sections (`src/lib/home.ts`), the site's origin and outbound links (`src/lib/site.ts`) and the global styles (`src/app/globals.css`). The Cabin's side of the home page is in [home room](home-room.md).

## One origin

- **`SITE_ORIGIN` is the non-www apex, `https://kihyun1998.com`; www answers with a 301 to it.** The layout (`metadataBase`, the OpenGraph `url`), robots and the sitemap all take it from this one constant, because nothing breaks when copies of it disagree: every URL still resolves and every page still renders. What goes wrong is downstream and quiet: a canonical pointing at one host while the sitemap advertises another, and the same content indexed twice.
- **The layout states `alternates: { canonical: '/' }`** so Google never has to guess which host variant to index.
- **The AdSense publisher id is written in two places, the layout's loader `src` and `public/ads.txt`, and cannot be one.** `ads.txt` is plain text served to crawlers and cannot import a constant; inside TypeScript there is only the one.
- **`BLOG_URL` and `GITHUB_URL` are the nav area's two outbound links**, and the home page's Blog and Online sections list them too.
- **`/ko` and `/en` and everything under them redirect permanently to the same path on blog.kihyun1998.com** (`next.config.ts`). The blog lived on this apex under those paths before it moved; Google still held the old URLs and Search Console reported 14 of them as 404s. Paths map 1:1 across the move, so the whole locale subtree is forwarded and the ranking signals follow. Next keeps the query string, which the `?from=...` share links already in the wild need.

## The AdSense loader

- **The loader is on this site, the apex domain, though the ads run on `blog.kihyun1998.com`**: AdSense reviews and approves a domain, and subdomains inherit the parent's status.
- **It is a raw `<script>` in the layout's `<head>`, on every page, not `next/script`**, so that a crawler that runs no JavaScript sees the tag. The layout's comment holds the AdSense and Next.js behaviour that forces this. That `next/script` emits no `<script src>` under the App Router was measured in the blog repository (its #87), where it cost a full review cycle.
- **No `<ins>` ad units on purpose**: review does not require them, and these are navigation-shaped pages.

## Fonts

- **Inter is self-hosted by `next/font` and exposed as `--font-inter`, which `globals.css` puts first in `--font-sans`; Pretendard, loaded from its CDN stylesheet, comes next.** Latin glyphs render in Inter and Korean glyphs fall through to Pretendard glyph by glyph (ADR-0002).

## Layout and header

- **The `<main>` top padding (`py-16 sm:py-24`) is tuned so a phone's first viewport carries the Identity Statement and the start of the first section**, rather than the header and white space.
- **The wordmark is the page's `h1` on every route**, so each page has one top-level heading and the section headings sit under it as `h2`s. It links home, which gives every subpage a way back.
- **The nav area holds the entries for the home page's sections, the two outbound links and the language and theme toggles, and, while the Cabin is shown, the dome lights toggle** (`GLOSSARY.md`). An outbound link carries a small trailing arrow (`ExternalLink`).
- **`globals.css` lays `.site-header` out.** While the Cabin is shown (`cabin.tsx` marks `<html data-home="cabin">`), the header lies over it as a white bar across the top, the wordmark beside the nav area; the bar itself takes no pointer, so a drag that starts on it reaches the Cabin, while its children do.
- **The footer carries no copyright year.** Every page is generated at build, so a year computed at render is a year computed at build, frozen until the next deploy while the code reads as if it maintains itself. A field that cannot stay true and carries nothing anyway is the kind ADR-0003 argues against, so it was dropped rather than kept accurate.

## The home page's sections

- **`HOME_SECTIONS` lists the home page's sections in nav and tab order**, as the nav entries, the Reading Home and the Cabin Screen's tabs name them (the titles are `sectionTitle`'s; see `home-room.md`, "The scene in parts"); each `id` is that section's element id in the Reading Home. `sectionHref` is the link to one from any page, and `sectionFromHash` reads one back from a URL hash.
- **Activating a nav entry dispatches `HOME_SECTION_EVENT` (`home-section`) on `window`, the section's id as `detail`**; that is what zooms the Cabin to that tab of the Cabin Screen. On the home page the entry also scrolls the Reading Home to the section; from another page the link's hash does. A press with a modifier key or a button other than the main one opens the link elsewhere and leaves this page as it is.
- **`shownSection` is the section the Cabin Screen shows while the view is zoomed to it**, and null at the seat and whenever the Cabin is not shown. The Cabin sets it from what its view shows, or null when it goes; the nav entry for it is marked `aria-current`.
- **The Reading Home (`src/app/page.tsx`) is what the server renders, with the Cabin mounted over it in the browser.** Its Blog and Online sections list what the Cabin Screen's tabs of the same names list.

## Theme and language

- **Values that live outside React and only in the browser (the `dark` class on `<html>`, a `localStorage` key) are read through `useSyncExternalStore` with a `createClientStore`**, rather than copied into state from an effect. The outside value stays the single source of truth, with no React copy to drift out of sync, and the server/client split is a server snapshot instead of a `mounted` flag. `notify` is called after writing the outside value, so readers re-render. A value the page holds in memory outside React, not in the browser (`shownSection` in `home.ts`, `domeLights` in `dome-lights.ts`, since #40), is a `createValueStore` from the same module, which keeps the value and notifies only when a set changes it; the three browser-backed stores (`themeStore`, `languageStore`, the Cabin's `homeStore`) stay `createClientStore`s, since their value lives in the DOM or `localStorage`.
- **The theme is the `dark` class on `<html>`.** The inline `themeScript` in the layout sets it before first paint, from the stored choice or else the OS setting, so the page never flashes the wrong theme; `theme.ts` reads and changes it under the same storage key, `theme`. The theme toggle and the Cabin's lighting both read it from `theme.ts`. `setDark` stores the visitor's choice.
- **The theme has no React context, unlike the language**: it overrides an environment preference rather than declared content.
- **The server cannot know the resolved theme**, so `ThemeToggle`'s server snapshot is null and the button renders as a fixed-size placeholder until hydration.
- **The language is stored under `lang`**, English when nothing is stored or storage cannot be read (ADR-0001). The server has no `localStorage` and renders English, and the client adopts the stored choice at hydration, so the Identity Statement may flash from English to Korean for a moment; that was accepted. There is no copy of the stored value in state.
- **The language toggle's label names the language it switches to**, not the current one.
- **The Identity Statement's element carries `lang` following the toggle**, so screen readers read the Korean sentence with a Korean voice while `<html lang>` stays `en`. Its text is in `src/lib/i18n.ts`; its constraints, among them that it names no Ecosystem, are in `GLOSSARY.md`.
- **`i18n.test.ts` pins the Korean and English Identity Statement to the same sentence count, and to the glossary's ceiling of three.** The toggle swaps the statement whole, and a Korean version a sentence behind the English would show a shorter statement with no sign anything is missing.

## Global styles

- **Keyboard focus is a 2px ring (`:focus-visible`).** The tweakcn default, the ring colour at half opacity with no width, was effectively invisible.
- **Each top-level block of `<main>` fades and slides up in turn on page load**, 80ms apart. The header and footer are direct children of `<main>` too, so they take part.
- **Under `prefers-reduced-motion: reduce`, every animation and transition is cut to 0.01ms**: the colour and opacity transitions of links, toggles and hovers, and the entrance.
- **`cabin-loading` is the look of the Cabin's loading state**, shared by the cover drawn before first paint and the Cabin's own status line. The cover shows while the `<head>` script's mark reads `cover` (`src/lib/cabin-cover.ts`).
