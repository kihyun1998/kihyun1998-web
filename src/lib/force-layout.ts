// The Dependency Map's layout: a small force simulation. Every pair of nodes
// repels, every link is a spring, a weak pull keeps the whole thing centred,
// and a last pass pushes overlapping labels apart. Hand-rolled rather than a
// library — a dozen nodes don't need one.
//
// Everything here is plain arithmetic from a fixed starting position, so
// `settle` gives the same answer on the server and in the browser: the page
// renders already at rest, and the same shape on every visit.
// See docs/adr/0010-dependency-map.md.

export const LAYOUT_WIDTH = 960;
export const LAYOUT_HEIGHT = 620;

// Labels are monospace at 11px, centred under their node.
const CHAR_WIDTH = 6.6;
const LABEL_BOX_HEIGHT = 34;

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Held in place while being dragged.
  pinned: boolean;
};

// `loose` links (Example Dependencies) are longer, weaker springs.
export type LayoutLink = { from: string; to: string; loose: boolean };

// A loose ellipse in declared order.
export function seed(ids: string[]): LayoutNode[] {
  return ids.map((id, i) => {
    const angle = (i / ids.length) * Math.PI * 2;
    const r = 160 + (i % 3) * 50;
    return {
      id,
      x: LAYOUT_WIDTH / 2 + Math.cos(angle) * r,
      y: LAYOUT_HEIGHT / 2 + Math.sin(angle) * r * 0.7,
      vx: 0,
      vy: 0,
      pinned: false,
    };
  });
}

// One step, mutating `nodes`. `alpha` (0–1) is how much it may still move.
export function tick(nodes: LayoutNode[], links: LayoutLink[], alpha: number) {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = Math.max(dx * dx + dy * dy, 100);
      const d = Math.sqrt(d2);
      const f = (60000 * alpha) / d2;
      a.vx -= (dx / d) * f;
      a.vy -= (dy / d) * f;
      b.vx += (dx / d) * f;
      b.vy += (dy / d) * f;
    }

  for (const link of links) {
    const a = byId.get(link.from)!;
    const b = byId.get(link.to)!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const f = (d - (link.loose ? 230 : 170)) * (link.loose ? 0.03 : 0.06) * alpha;
    a.vx += (dx / d) * f;
    a.vy += (dy / d) * f;
    b.vx -= (dx / d) * f;
    b.vy -= (dy / d) * f;
  }

  for (const node of nodes) {
    node.vx += (LAYOUT_WIDTH / 2 - node.x) * 0.004 * alpha;
    node.vy += (LAYOUT_HEIGHT / 2 - node.y) * 0.008 * alpha;
    if (node.pinned) {
      node.vx = node.vy = 0;
      continue;
    }
    node.vx *= 0.55;
    node.vy *= 0.55;
    node.x = clamp(node.x + node.vx, 90, LAYOUT_WIDTH - 90);
    node.y = clamp(node.y + node.vy, 24, LAYOUT_HEIGHT - 30);
  }

  // Treat each node and its label as a box; push overlapping pairs apart
  // along whichever axis needs the shorter move.
  const half = (node: LayoutNode) => (node.id.length * CHAR_WIDTH) / 2 + 6;
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const ox = half(a) + half(b) - Math.abs(b.x - a.x);
      const oy = LABEL_BOX_HEIGHT - Math.abs(b.y - a.y);
      if (ox <= 0 || oy <= 0) continue;
      const sx = ox < oy * 3 ? Math.sign(b.x - a.x || 1) * ox * 0.25 : 0;
      const sy = sx === 0 ? Math.sign(b.y - a.y || 1) * oy * 0.25 : 0;
      if (!a.pinned) {
        a.x -= sx;
        a.y -= sy;
      }
      if (!b.pinned) {
        b.x += sx;
        b.y += sy;
      }
    }
}

// Run from the seed until alpha has cooled — the at-rest layout.
export function settle(ids: string[], links: LayoutLink[]): LayoutNode[] {
  const nodes = seed(ids);
  for (let alpha = 1; alpha > COOL; alpha *= DECAY) tick(nodes, links, alpha);
  return nodes;
}

// A point on the ring of unconnected Packages. `side` says which way its label
// runs, so labels point away from the graph instead of along the ring.
export type OrbitPoint = {
  id: string;
  x: number;
  y: number;
  side: 'left' | 'right' | 'top' | 'bottom';
};

// Margins from the cluster's bounds out to the ring.
const ORBIT_GAP_X = 150;
const ORBIT_GAP_Y = 90;

// Unconnected Packages, evenly spaced in declared order on an ellipse just
// outside the settled cluster. They take no part in the simulation, so they
// never push the connected Packages around.
export function orbit(cluster: LayoutNode[], ids: string[]): OrbitPoint[] {
  const xs = cluster.map((node) => node.x);
  const ys = cluster.map((node) => node.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + ORBIT_GAP_X;
  const ry = (Math.max(...ys) - Math.min(...ys)) / 2 + ORBIT_GAP_Y;

  return ids.map((id, i) => {
    // Offset half a step from straight up, so no label sits dead on top.
    const angle = -Math.PI / 2 + ((i + 0.5) / ids.length) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const side =
      Math.abs(cos) < 0.25 ? (sin < 0 ? 'top' : 'bottom') : cos > 0 ? 'right' : 'left';
    return { id, x: cx + cos * rx, y: cy + sin * ry, side };
  });
}

// The drawing's bounds once the ring and its outward labels are added — the
// layout box itself, grown to fit. Labels on the ring are 10.5px monospace.
export function fit(points: OrbitPoint[]) {
  const span = (id: string) => id.length * 6.3 + 12;
  const pad = 20;
  let minX = 0;
  let maxX = LAYOUT_WIDTH;
  let minY = 0;
  let maxY = LAYOUT_HEIGHT;
  for (const { id, x, y, side } of points) {
    minX = Math.min(minX, side === 'left' ? x - span(id) : x - span(id) / 2);
    maxX = Math.max(maxX, side === 'right' ? x + span(id) : x + span(id) / 2);
    minY = Math.min(minY, y - 16);
    maxY = Math.max(maxY, y + 20);
  }
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

// Per-step cooling, and the alpha below which a layout counts as at rest.
export const DECAY = 0.985;
export const COOL = 0.01;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
