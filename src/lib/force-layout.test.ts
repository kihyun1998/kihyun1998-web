import { describe, expect, it } from 'vitest';
import {
  LAYOUT_HEIGHT,
  LAYOUT_WIDTH,
  orbit,
  settle,
  type LayoutLink,
} from './force-layout';

const ids = ['app_widget', 'demo_shell', 'base_scroll', 'base_tooltip', 'far_away'];
const links: LayoutLink[] = [
  { from: 'app_widget', to: 'base_scroll', loose: false },
  { from: 'app_widget', to: 'base_tooltip', loose: false },
  { from: 'demo_shell', to: 'base_scroll', loose: false },
  { from: 'app_widget', to: 'demo_shell', loose: true },
];

describe('settle', () => {
  // The server renders the settled layout and the browser hydrates it; the
  // two only agree if settling is a pure function of its input.
  it('lands on the same layout every time', () => {
    expect(settle(ids, links)).toEqual(settle(ids, links));
  });

  it('keeps every node inside the drawing', () => {
    for (const node of settle(ids, links)) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(LAYOUT_WIDTH);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(LAYOUT_HEIGHT);
    }
  });

  it('draws linked Packages nearer each other than an unlinked one', () => {
    const at = new Map(settle(ids, links).map((node) => [node.id, node]));
    const distance = (a: string, b: string) =>
      Math.hypot(at.get(a)!.x - at.get(b)!.x, at.get(a)!.y - at.get(b)!.y);

    expect(distance('demo_shell', 'base_scroll')).toBeLessThan(
      distance('demo_shell', 'far_away'),
    );
  });
});

describe('orbit', () => {
  const cluster = settle(ids, links);
  const loners = ['lone_a', 'lone_b', 'lone_c', 'lone_d'];

  it('places every unconnected Package outside the settled cluster', () => {
    const left = Math.min(...cluster.map((node) => node.x));
    const right = Math.max(...cluster.map((node) => node.x));
    const top = Math.min(...cluster.map((node) => node.y));
    const bottom = Math.max(...cluster.map((node) => node.y));

    for (const point of orbit(cluster, loners)) {
      const inside =
        point.x > left && point.x < right && point.y > top && point.y < bottom;
      expect(inside).toBe(false);
    }
  });

  it('keeps declared order around the ring, one point each', () => {
    expect(orbit(cluster, loners).map((point) => point.id)).toEqual(loners);
  });
});
