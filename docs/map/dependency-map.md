# Dependency Map

The page at `/open-source/dependencies`: `src/components/dependency-map.tsx` draws it, `src/lib/force-layout.ts` lays it out, and `deriveDependencyGraph` in `src/lib/open-source.ts` feeds it (its checks are in [curated lists](curated-lists.md)). What it is and why it is free-form, one graph per Ecosystem, with unconnected Packages on a ring, is ADR-0010. This note holds how it is drawn.

## What the page shows

- **One tab per Ecosystem, in the order Ecosystems first appear in `packages`.** Each tab holds the Packages with a Dependency or Example Dependency in either direction, and the rest of that Ecosystem's Packages on a ring around them.
- **A solid edge is a Dependency ("installed with it"), a dashed one an Example Dependency ("used by its example app").** An arrow points at the Package being used.
- **A node used by others is filled and grows with how many use it**: radius `5 + 2.2 ×` its users. A node used by none is hollow.
- **Hovering a node lights it and its direct neighbours; clicking keeps them lit** until the node, or the empty background, is clicked again. With nothing hovered, the selection holds. Keyboard focus on a node's label lights it like a hover.
- **A node's name links to its registry page**, like a Package row's registry icon.
- **`Graph` is keyed by Ecosystem**, so each tab gets its own settled layout and its own selection rather than one graph morphing into another.
- **The drawing is wider than the text column**, up to 64rem: the graph needs the room. On a phone the SVG keeps at least 640px and scrolls sideways instead of shrinking.

## The layout

`force-layout.ts` is a small force simulation, written by hand rather than taken from a library because a dozen nodes do not need one. In each `tick`, every pair of nodes repels, every link is a spring, a weak pull keeps the whole centred, and a last pass pushes overlapping labels apart.

- **`settle` gives the same answer on the server and in the browser.** It is plain arithmetic from a fixed starting position (`seed`: an ellipse in declared order), so the page renders already at rest and in the same shape on every visit, and hydration agrees with the server's HTML. `force-layout.test.ts` pins this ("lands on the same layout every time").
- **`settle` runs ticks from alpha 1, multiplying by `DECAY` (0.985) each step, until alpha falls below `COOL` (0.01)**, the alpha at which a layout counts as at rest. `alpha` (0–1) is how far a node may still move in a tick.
- **A `loose` link (an Example Dependency) is a longer, weaker spring**: rest length 230 against 170, stiffness 0.03 against 0.06.
- **The label pass treats each node and its label as a box** and pushes an overlapping pair apart: sideways unless the sideways overlap is at least three times the vertical one, and vertically then (`ox < oy * 3`), a quarter of the overlap per tick. A box's width comes from `CHAR_WIDTH` (6.6) per character, the advance of the 11px monospace labels `Graph` draws centred under each node; its height is `LABEL_BOX_HEIGHT` (34). Change the label size in `dependency-map.tsx` and these follow it by hand.
- **A pinned node (being dragged) is held in place** and is left out of the label pass's moves.

## The ring

- **`orbit` places the unconnected Packages evenly, in declared order, on an ellipse just outside the settled cluster**: the cluster's bounds plus `ORBIT_GAP_X` (150) and `ORBIT_GAP_Y` (90). They take no part in the simulation, so they never push the connected Packages around.
- **The ring starts half a step from straight up**, so no label sits dead on top. Each point's `side` says which way its label runs, so labels point away from the graph rather than along the ring.
- **The ring is placed once, round where the graph first settles, and stays put** while nodes inside it are dragged.
- **`fit` grows the layout box (`LAYOUT_WIDTH` × `LAYOUT_HEIGHT`, 960 × 620) to take the ring and its outward labels**; it measures a ring label at 6.3 per character, for the 10.5px monospace the ring's labels are drawn in.

## Dragging

- **A press becomes a drag once the pointer travels `CLICK_SLOP` (4 drawing units)**; less than that is a click, which selects.
- **A drag pins the node and reheats the layout**: `reheat` raises alpha to at least 0.3 and runs a tick per animation frame until it cools below `COOL` again. Releasing unpins the node. That is the only motion on the page.
