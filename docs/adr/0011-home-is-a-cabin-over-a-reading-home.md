---
name: adr-0011-home-is-a-cabin-over-a-reading-home
status: accepted
---

# The home page is a Cabin laid over a Reading Home

[[adr-0008-home-introduces-the-person]] made the home page's first job introducing the person; a column of sections still read as a catalogue. The home page becomes a **Cabin**: a 3D scene inside a two-seat driverless car, driving, seen from a passenger seat. The visitor looks around it and reaches the site through the **Cabin Screen** on its dashboard. Underneath it, the server still sends the **Reading Home** — the Identity Statement and the Open Source, Projects, Blog and Online sections as plain HTML — which crawlers and screen readers read, which a visitor gets when the Cabin cannot run (no WebGL, too slow in its first seconds, or not ready within the time limit) or when they ask for reduced motion and have not chosen the Cabin, and which a visitor can switch to and have remembered.

## Why a cabin

Prototyped on 2026-11-11 against felixrieseberg.com's interactive room: an eye-level room beat a diorama; a hanok, a penthouse, a developer's den and a Namsan-view house were each built and dropped, because an empty room with a view said nothing about the person and photographed views read as fake. The car interior won: the thing liked is the space itself, a screen is a natural place for navigation, and a small enclosed scene can be made convincing and kept light.

## What changes

- **Home layout.** GLOSSARY's "identity statement, then Open Source, then Projects" now describes the Reading Home, not what a visitor first sees. The Reading Home also gains a Blog section (the one link to the Blog) and an Online section (the GitHub profile and the Blog), listing what those tabs of the Cabin Screen list, so that each of the five nav entries reaches a section there; Blog had been an outbound link in the nav area and no section. Kihyun's decision, 2026-11-12, over showing those two entries only in the Cabin or pointing them at the nav area's outbound links. [[adr-0005-curated-home-full-pages]] holds on the Reading Home (capped lists, an unconditional "See all"), so the full-list pages stay in the internal link graph.
- **Navigation.** The nav area gains internal entries (About, Open Source, Projects, Blog, Online) beside the Blog and GitHub links and the toggles, so the Cabin Screen's sections are reachable by keyboard and screen reader without the scene.
- **Theme.** In the Cabin the theme toggle sets the cabin's lighting (light: day, dark: night), defaulting to the OS setting; elsewhere it is unchanged. The Language Toggle still flips the Identity Statement, wherever it is shown.
- **The Cabin Screen stays at the real screen's size**; pressing it brings the view close, and a Back control returns.
- **No maker's name or mark** appears anywhere on the site, though the cabin is modelled after a real robotaxi interior; the references live in the repository's notes only.

## Considered and rejected

- *A room filled with liked objects* (the first brief): the room read as a template until filled, and filling it was open-ended.
- *Photographed window views*: each looked like a poster without a fitted camera, time-of-day set and matching interior light.
- *Making the screen larger than life*: zooming to a real-size screen gives the same legibility without breaking the scene.
- *3D only, no document underneath*: loses crawlers, screen readers and devices that cannot run it.

## Consequences

- The view outside the windows is decided separately; until then a placeholder street is drawn.
- While the Cabin covers the Reading Home, the Reading Home takes no focus and is left out of what assistive technology reads (#22, 2026-11-12, as Kihyun wrote it), from the moment the page's script runs; under the first-paint loading cover before that it stays as it was (#21): in the Cabin a keyboard or screen-reader user has the site header, the Back control and the switch, and the nav entry for the Cabin Screen's tab is marked current while zoomed; the sections' text is read in the Reading Home, one switch away. "Screen readers read" above means the Reading Home as shown.
- [[adr-0008-home-introduces-the-person]]'s decision that the wordmark is each page's `h1` holds on the home page too. The Cabin adds no heading of its own (the scene is one described image, with a Back control and the switch), and the site header, wordmark included, lies over the Cabin while it is shown, so the one `h1` is visible in the Cabin and in the Reading Home alike and the sections stay `h2` beneath it.
