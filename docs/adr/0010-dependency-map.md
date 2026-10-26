---
name: adr-0010-dependency-map
status: accepted
---

# Dependencies between Packages are drawn as a free-form graph, example apps included

Many **Package**s are built on other Packages of Kihyun's — `flutter_smooth_wheel_scroll` sits under five Flutter Packages, `justpdf-core` under six crates — and nothing on the site showed it. A relation like that is not a **Family**: it is pairwise, and one Package can sit under many others, while a Package joins at most one Family.

**Decision:** Each Package declares, by hand, the other Packages it uses — its **Dependency**s — and, separately, the ones only its example app uses — its **Example Dependency**s. A **Dependency Map** page at `/open-source/dependencies` draws them as force-directed graphs, one per **Ecosystem** on its own tab: no layers, solid edges for Dependencies, dashed edges for Example Dependencies.

## Why one graph per Ecosystem

Every relation recorded so far stays inside one Ecosystem — the Flutter widgets among themselves, the `justpdf` crates, the `justerm` npm packages — so a single graph is three islands that never touch, and the Flutter one, the reason the page exists, gets a third of the room. A tab per Ecosystem gives each island the whole drawing.

The cost is that a Dependency may not cross Ecosystems, since no tab could draw it. Such relations exist in spirit — `justerm-wasm-decode` and `justpdf-compress-wasm` are npm builds of Rust code — but no manifest records them, and they stay unrecorded until there is a reason to draw them.

## Why free-form, not layered

The first instinct was layers — foundation at the bottom, each Package one level above the highest thing it uses. Eight variants were prototyped (a layered list, a stacked diagram, rails, a sideways flow, a circuit-style blueprint, a matrix, a text tree, a focus picker). The layered diagram won the first round and then fell apart on two questions:

- **Example apps.** `flutter_dropdown_button`, `flutter_table_plus` and `flutter_folderview` demo themselves with `flutter_example_template`. Counted as layers, all three jump to the top, above the template — a picture saying they are built on something a user installing them never gets. Left out, a real and wanted relation disappears.
- **Cycles.** Layer numbers are undefined the moment two Packages use each other. None do today; nothing forbids it.

A free-form graph has neither problem. Position means only "near what it's connected to", so an Example Dependency can be drawn without claiming anything about height, and a cycle is just a loop.

## Unconnected Packages sit on a ring

A Package with no Dependency or Example Dependency either way — eighteen of the Flutter ones, `justerm-core` among the crates — is drawn on an ellipse just outside the settled graph, small and muted. Left off entirely, the map hid them, and `justerm-core` going missing read as an error. Fed into the simulation, they pushed the connected Packages into a corner. On the ring they take no part in the simulation: they are placed after it settles and never move, with labels pointing outward so eighteen fit without overlapping.

A strip of chips under the graph was prototyped against the ring and lost: it read as a separate list rather than as part of the same picture.

## Why the layout is settled ahead of time

The simulation runs to rest on a fixed starting position before anything renders, on the server and in the browser alike, so every visit sees the same shape and the page does not open on a moving graph. Dragging a node reheats it locally; that is the only motion.

## Considered and rejected

- *Reading dependencies from pub.dev at build time.* pub.dev publishes only a Package's own manifest, so Example Dependencies would need GitHub reads too — three registries plus GitHub at build for a few dozen edges, against a site whose every list is hand-curated.
- *Showing Dependencies on Package rows.* [[adr-0003-minimal-project-card]] holds: a row is a name and an **Ecosystem** tag.

## Consequences

- **Mistakes throw at build time**, as for Families: a name absent from `packages`, a Package using itself, a name listed twice, a pair recorded both as a Dependency and an Example Dependency, or a Dependency across Ecosystems.
- **`dependencies` is a reserved Family slug**, since `/open-source/dependencies` is this page.
- **Family members appear as individual nodes here.** A Family stays one collapsed row in the list; on the map, `justpdf-core` and its six users are drawn one by one, because the edges between them are the point.
