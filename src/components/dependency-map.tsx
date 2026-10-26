'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COOL,
  DECAY,
  fit,
  orbit,
  settle,
  tick,
  type LayoutLink,
  type LayoutNode,
} from '@/lib/force-layout';
import type {
  DependencyGraph,
  DependencyLink,
  Ecosystem,
  Package,
} from '@/lib/open-source';
import { cn } from '@/lib/utils';

// The Dependency Map: every Package with a Dependency or Example Dependency in
// either direction, as one free-form graph per Ecosystem, one tab each, with
// the rest of that Ecosystem's Packages on a ring around it. Solid edge =
// installed with it, dashed = used by its example app. Each graph renders
// already at rest; dragging a node reheats it. Hovering a node lights
// its direct neighbours; clicking it keeps them lit until it, or the empty
// background, is clicked again. A node's name links to its registry page,
// like a Package row's registry icon. See docs/adr/0010-dependency-map.md.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// Pointer travel, in drawing units, past which a press is a drag, not a click.
const CLICK_SLOP = 4;

export function DependencyMap({ graph }: { graph: DependencyGraph }) {
  // Tabs follow the order Ecosystems first appear in the curated list.
  const ecosystems = [...new Set(graph.packages.map((entry) => entry.ecosystem))];
  const [current, setCurrent] = useState<Ecosystem>(ecosystems[0]);

  const packages = graph.packages.filter((entry) => entry.ecosystem === current);
  const names = new Set(packages.map((entry) => entry.name));
  const links = graph.links.filter((link) => names.has(link.from));
  const unconnected = graph.unconnected.filter((entry) => entry.ecosystem === current);

  return (
    <div>
      <div role="tablist" aria-label="Ecosystem" className="flex gap-5 text-sm">
        {ecosystems.map((ecosystem) => (
          <button
            key={ecosystem}
            role="tab"
            aria-selected={ecosystem === current}
            onClick={() => setCurrent(ecosystem)}
            className={cn(
              'underline-offset-4 transition-colors',
              ecosystem === current
                ? 'text-foreground underline'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {ecosystem}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <Legend dashed={false}>installed with it</Legend>
        <Legend dashed>used by its example app</Legend>
      </div>

      {/* Keyed by Ecosystem so each tab gets its own settled layout and its
          own selection, rather than one graph morphing into another. */}
      <Graph key={current} packages={packages} links={links} unconnected={unconnected} />

      <p className="mt-4 text-sm text-muted-foreground">
        A filled node is used by others, and grows with how many; the ring
        holds packages connected to none of these. Click a node to keep its
        links lit; drag it to move it.
      </p>
    </div>
  );
}

function Graph({
  packages,
  links,
  unconnected,
}: {
  packages: Package[];
  links: DependencyLink[];
  unconnected: Package[];
}) {
  const layoutLinks: LayoutLink[] = links.map((link) => ({
    from: link.from,
    to: link.to,
    loose: link.kind === 'example',
  }));

  // The ring is placed once, around where the graph settles, and stays put
  // while nodes inside it are dragged.
  const [start] = useState(() => {
    const settled = settle(
      packages.map((entry) => entry.name),
      layoutLinks,
    );
    const ring = orbit(
      settled,
      unconnected.map((entry) => entry.name),
    );
    return { settled, ring, box: fit(ring) };
  });
  const { ring, box } = start;
  const [nodes, setNodes] = useState<LayoutNode[]>(start.settled);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const sim = useRef(start.settled);
  const alpha = useRef(0);
  const frame = useRef(0);
  const svg = useRef<SVGSVGElement>(null);
  const press = useRef<{ id: string; x: number; y: number; dragged: boolean } | null>(null);

  // Run frames until the layout cools again.
  const reheat = useCallback(() => {
    alpha.current = Math.max(alpha.current, 0.3);
    if (frame.current) return;
    const loop = () => {
      tick(sim.current, layoutLinks, alpha.current);
      alpha.current *= DECAY;
      setNodes(sim.current.map((node) => ({ ...node })));
      frame.current = alpha.current > COOL ? requestAnimationFrame(loop) : 0;
    };
    frame.current = requestAnimationFrame(loop);
    // layoutLinks is rebuilt each render from props that never change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const pointAt = (e: React.PointerEvent) =>
    new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.current!.getScreenCTM()!.inverse(),
    );

  const grab = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    svg.current!.setPointerCapture(e.pointerId);
    const { x, y } = pointAt(e);
    press.current = { id, x, y, dragged: false };
  };
  const move = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const { x, y } = pointAt(e);
    if (!p.dragged && Math.hypot(x - p.x, y - p.y) < CLICK_SLOP) return;
    p.dragged = true;
    const node = sim.current.find((n) => n.id === p.id)!;
    Object.assign(node, { x, y, pinned: true });
    reheat();
  };
  const release = () => {
    const p = press.current;
    if (!p) return;
    press.current = null;
    if (p.dragged) {
      sim.current.find((n) => n.id === p.id)!.pinned = false;
      return;
    }
    setSelected((current) => (current === p.id ? null : p.id));
  };
  // A press on the empty background clears the selection.
  const pressBackground = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget) setSelected(null);
  };

  // Hover previews; with nothing hovered, the selection holds.
  const active = hovered ?? selected;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const usedBy = (name: string) => links.filter((link) => link.to === name).length;
  const radius = (name: string) => 5 + 2.2 * usedBy(name);
  const touches = (link: DependencyLink) =>
    active !== null && (link.from === active || link.to === active);
  const near = active
    ? new Set([active, ...links.filter(touches).flatMap((l) => [l.from, l.to])])
    : null;

  return (
    // Wider than the text column: the graph needs the room. On a phone it
    // keeps a readable size and scrolls sideways instead of shrinking.
    <div className="relative left-1/2 mt-6 w-[min(calc(100vw-2rem),64rem)] -translate-x-1/2 overflow-x-auto rounded-lg border border-border">
      <svg
        ref={svg}
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        className="block w-full min-w-[640px] select-none"
        style={{ fontFamily: MONO }}
        role="img"
        aria-label="Graph of which of Ki Hyun Park's packages use which"
        onPointerDown={pressBackground}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <defs>
          {(['dim', 'lit'] as const).map((tone) => (
            <marker
              key={tone}
              id={`dependency-arrow-${tone}`}
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto"
            >
              <path
                d="M0,1 L9,5 L0,9 z"
                className={tone === 'lit' ? 'fill-foreground' : 'fill-muted-foreground'}
              />
            </marker>
          ))}
        </defs>

        {links.map((link) => {
          const a = byId.get(link.from)!;
          const b = byId.get(link.to)!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const startGap = radius(link.from) + 2;
          const endGap = radius(link.to) + 4;
          const lit = touches(link);
          return (
            <line
              key={`${link.from}>${link.to}`}
              x1={a.x + (dx / d) * startGap}
              y1={a.y + (dy / d) * startGap}
              x2={b.x - (dx / d) * endGap}
              y2={b.y - (dy / d) * endGap}
              strokeWidth={lit ? 1.6 : 1.1}
              strokeDasharray={link.kind === 'example' ? '5 4' : undefined}
              markerEnd={`url(#dependency-arrow-${lit ? 'lit' : 'dim'})`}
              className={cn(
                'pointer-events-none transition-opacity',
                lit ? 'stroke-foreground' : 'stroke-muted-foreground/60',
                active !== null && !lit && 'opacity-15',
              )}
            />
          );
        })}

        {nodes.map((node) => {
          const entry = packages.find((p) => p.name === node.id)!;
          const r = radius(node.id);
          return (
            <g
              key={node.id}
              className={cn(
                'transition-opacity',
                near !== null && !near.has(node.id) && 'opacity-20',
              )}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {node.id === selected && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 5}
                  strokeWidth={1.25}
                  className="pointer-events-none fill-none stroke-foreground"
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                strokeWidth={1.5}
                onPointerDown={grab(node.id)}
                className={cn(
                  'cursor-pointer touch-none stroke-foreground',
                  usedBy(node.id) > 0 ? 'fill-foreground' : 'fill-background',
                )}
              />
              <a
                href={entry.href}
                target="_blank"
                rel="noreferrer"
                onFocus={() => setHovered(node.id)}
                onBlur={() => setHovered(null)}
              >
                <text
                  x={node.x}
                  y={node.y + r + 13}
                  textAnchor="middle"
                  fontSize={11}
                  strokeWidth={4}
                  paintOrder="stroke"
                  className="fill-foreground stroke-background hover:underline"
                >
                  {node.id}
                </text>
              </a>
            </g>
          );
        })}

        {ring.map(({ id, x, y, side }) => {
          const entry = unconnected.find((p) => p.name === id)!;
          const label = {
            left: { dx: -8, dy: 4, anchor: 'end' },
            right: { dx: 8, dy: 4, anchor: 'start' },
            top: { dx: 0, dy: -9, anchor: 'middle' },
            bottom: { dx: 0, dy: 16, anchor: 'middle' },
          }[side] as { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' };
          return (
            <g
              key={id}
              className={cn(
                'transition-opacity',
                near !== null && !near.has(id) && 'opacity-30',
              )}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
            >
              {id === selected && (
                <circle
                  cx={x}
                  cy={y}
                  r={8}
                  strokeWidth={1.25}
                  className="pointer-events-none fill-none stroke-foreground"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={3.5}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelected((current) => (current === id ? null : id));
                }}
                className="cursor-pointer fill-muted-foreground/50"
              />
              <a
                href={entry.href}
                target="_blank"
                rel="noreferrer"
                onFocus={() => setHovered(id)}
                onBlur={() => setHovered(null)}
              >
                <text
                  x={x + label.dx}
                  y={y + label.dy}
                  textAnchor={label.anchor}
                  fontSize={10.5}
                  className="fill-muted-foreground hover:underline"
                >
                  {id}
                </text>
              </a>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Legend({ dashed, children }: { dashed: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <svg width={28} height={6} aria-hidden>
        <line
          x1={0}
          x2={28}
          y1={3}
          y2={3}
          strokeWidth={1.5}
          strokeDasharray={dashed ? '4 3' : undefined}
          className="stroke-muted-foreground"
        />
      </svg>
      {children}
    </span>
  );
}
