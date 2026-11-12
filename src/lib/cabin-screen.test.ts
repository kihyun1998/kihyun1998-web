import { describe, expect, it } from 'vitest';
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  layoutScreen,
  screenContent,
  zoneAt,
  type ScreenContent,
  type ScreenState,
  type TextOp,
  type Zone,
} from './cabin-screen';
import { HOME_LIMIT, HOME_SECTIONS, sectionFromHash, sectionHref } from './home';
import { identityStatement } from './i18n';
import { openSourceRows } from './open-source';
import { projects } from './projects';
import { BLOG_URL, GITHUB_URL } from './site';

// Every glyph is 0.5 em wide: enough to make widths depend on the text and
// the font size without a canvas.
const measure = (text: string, font: string) =>
  text.length * Number(/(\d+)px/.exec(font)![1]) * 0.5;

const state = (over: Partial<ScreenState> = {}): ScreenState => ({
  tab: 'about',
  language: 'en',
  lighting: 'day',
  hover: null,
  time: '09:41',
  speed: 50,
  ...over,
});

const texts = (ops: ReturnType<typeof layoutScreen>['ops']) =>
  ops.filter((op): op is TextOp => op.type === 'text');

describe('the home sections', () => {
  it('are About, Open Source, Projects, Blog and Online, in that order', () => {
    expect(HOME_SECTIONS.map((section) => section.title)).toEqual([
      'About',
      'Open Source',
      'Projects',
      'Blog',
      'Online',
    ]);
  });

  it('are found again from the hash their link carries', () => {
    for (const { id } of HOME_SECTIONS) {
      expect(sectionHref(id).startsWith('/#')).toBe(true);
      expect(sectionFromHash(sectionHref(id).slice(1))).toBe(id);
    }
  });

  it('carry the id the Reading Home gives the heading of that title', () => {
    expect(HOME_SECTIONS.filter(({ id }) => id !== 'about').map(({ id }) => id)).toEqual([
      'open-source',
      'projects',
      'blog',
      'online',
    ]);
    for (const { id, title } of HOME_SECTIONS) {
      if (id !== 'about') expect(screenContent(id, 'en').title).toBe(title);
    }
  });

  it('are not found from an empty or unknown hash', () => {
    expect(sectionFromHash('')).toBeNull();
    expect(sectionFromHash('#')).toBeNull();
    expect(sectionFromHash('#nowhere')).toBeNull();
  });
});

describe('what the Cabin Screen shows', () => {
  it('shows the Identity Statement on the About tab, in the chosen language', () => {
    expect(screenContent('about', 'en').statement).toBe(identityStatement.en);
    expect(screenContent('about', 'ko').statement).toBe(identityStatement.ko);
    expect(screenContent('about', 'ko').items).toEqual([]);
  });

  it('shows the capped Open Source rows with their tags and a See all link', () => {
    const content = screenContent('open-source', 'en');
    const rows = openSourceRows.slice(0, HOME_LIMIT);
    expect(HOME_LIMIT).toBe(6);
    expect(content.items.map((item) => item.name)).toEqual(rows.map((row) => row.name));
    expect(content.items.map((item) => item.href)).toEqual(rows.map((row) => row.href));
    expect(content.seeAll).toBe('/open-source');
    expect(content.statement).toBeUndefined();
  });

  it('tags a Package with its Ecosystem and a Family with its member count', () => {
    const content = screenContent('open-source', 'en', {
      openSource: [
        {
          kind: 'package',
          name: 'flutter_bin',
          ecosystem: 'Flutter',
          href: 'https://pub.dev/packages/flutter_bin',
          repo: 'https://github.com/kihyun1998/flutter_bin',
        },
        {
          kind: 'family',
          slug: 'justerm',
          name: 'justerm',
          href: '/open-source/justerm',
          memberCount: 4,
          ecosystems: ['Rust', 'npm'],
        },
      ],
      projects: [],
    });
    expect(content.items).toEqual([
      { name: 'flutter_bin', meta: 'Flutter', href: 'https://pub.dev/packages/flutter_bin' },
      { name: 'justerm', meta: '4 packages', href: '/open-source/justerm' },
    ]);
  });

  it('caps the rows it is given', () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      name: `Project ${index}`,
      href: `https://example.com/${index}`,
    }));
    const content = screenContent('projects', 'en', { openSource: [], projects: many });
    expect(content.items.map((item) => item.name)).toEqual(
      many.slice(0, 6).map((project) => project.name),
    );
  });

  it('shows the Projects with their descriptions and a See all link', () => {
    const content = screenContent('projects', 'en', {
      openSource: [],
      projects: [
        { name: 'Just MLB', href: 'https://mlb.kihyun1998.com', description: 'Live scores' },
        { name: 'Pricly', href: 'https://pricly.vercel.app' },
      ],
    });
    expect(content.items).toEqual([
      { name: 'Just MLB', href: 'https://mlb.kihyun1998.com', description: 'Live scores' },
      { name: 'Pricly', href: 'https://pricly.vercel.app' },
    ]);
    expect(content.seeAll).toBe('/projects');
    expect(screenContent('projects', 'en').items.map((item) => item.name)).toEqual(
      projects.slice(0, HOME_LIMIT).map((project) => project.name),
    );
  });

  it('gives the one link to the Blog on the Blog tab', () => {
    const content = screenContent('blog', 'en');
    expect(content.items.map((item) => item.href)).toEqual([BLOG_URL]);
    expect(content.seeAll).toBeUndefined();
  });

  it('gives the GitHub profile and the Blog on the Online tab', () => {
    const content = screenContent('online', 'en');
    expect(content.items.map((item) => [item.name, item.href])).toEqual([
      ['GitHub', GITHUB_URL],
      ['Blog', BLOG_URL],
    ]);
  });
});

describe('the Cabin Screen layout', () => {
  const inside = (zone: Zone) =>
    zone.x0 >= 0 && zone.y0 >= 0 && zone.x1 <= SCREEN_WIDTH && zone.y1 <= SCREEN_HEIGHT;
  const overlap = (a: Zone, b: Zone) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const centre = (zone: Zone) => [(zone.x0 + zone.x1) / 2, (zone.y0 + zone.y1) / 2] as const;

  it('is a 4:3 drawing', () => {
    expect(SCREEN_WIDTH / SCREEN_HEIGHT).toBeCloseTo(4 / 3);
  });

  it('shows the time and the speed', () => {
    const drawn = texts(layoutScreen(state({ time: '18:05', speed: 47.6 }), measure).ops);
    expect(drawn.some((op) => op.text === '18:05')).toBe(true);
    expect(drawn.some((op) => op.text === '48 km/h')).toBe(true);
  });

  it('has a zone for each tab, found again from its centre', () => {
    const { zones } = layoutScreen(state(), measure);
    const tabs = zones.filter((zone) => zone.kind === 'tab');
    expect(tabs.map((zone) => zone.tab)).toEqual(HOME_SECTIONS.map((section) => section.id));
    for (const zone of tabs) expect(zoneAt(zones, ...centre(zone))).toBe(zone);
  });

  it.each(HOME_SECTIONS.map((section) => section.id))(
    'on the %s tab, keeps every zone on the screen and apart from the others',
    (tab) => {
      const { zones } = layoutScreen(state({ tab }), measure);
      for (const zone of zones) expect(inside(zone)).toBe(true);
      zones.forEach((a, i) => {
        for (const b of zones.slice(i + 1)) expect(overlap(a, b)).toBe(false);
      });
    },
  );

  it('has a zone for each item and for See all, opening that destination', () => {
    const content = screenContent('open-source', 'en');
    const { zones } = layoutScreen(state({ tab: 'open-source' }), measure);
    const items = zones.filter((zone) => zone.kind === 'item');
    expect(items.map((zone) => zone.href)).toEqual([
      ...content.items.map((item) => item.href),
      '/open-source',
    ]);
    expect(items).toHaveLength(HOME_LIMIT + 1);
  });

  it('finds nothing off the zones', () => {
    const { zones } = layoutScreen(state({ tab: 'blog' }), measure);
    expect(zoneAt(zones, -1, -1)).toBeNull();
    expect(zoneAt(zones, SCREEN_WIDTH - 1, SCREEN_HEIGHT - 1)).toBeNull();
  });

  it('draws each item name, tag and description', () => {
    const content: ScreenContent = {
      title: 'Projects',
      items: [
        { name: 'Just MLB', href: 'https://mlb.kihyun1998.com', description: 'Live scores' },
        { name: 'flutter_bin', meta: 'Flutter', href: 'https://pub.dev/packages/flutter_bin' },
      ],
    };
    const drawn = texts(layoutScreen(state({ tab: 'projects' }), measure, content).ops).map(
      (op) => op.text,
    );
    expect(drawn).toEqual(
      expect.arrayContaining(['Projects', 'Just MLB', 'Live scores', 'flutter_bin', 'Flutter']),
    );
  });

  it('fills the hovered zone and no other', () => {
    const plain = layoutScreen(state({ tab: 'projects' }), measure);
    const item = plain.zones.filter((zone) => zone.kind === 'item')[2];
    const hovered = layoutScreen(state({ tab: 'projects', hover: item.key }), measure);
    const fills = (ops: typeof plain.ops) => ops.filter((op) => op.type === 'rect');
    const added = fills(hovered.ops).filter(
      (rect) => !fills(plain.ops).some((other) => JSON.stringify(other) === JSON.stringify(rect)),
    );
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ x: item.x0, y: item.y0 });
    expect(hovered.zones).toEqual(plain.zones);
  });

  it('marks the open tab and no other', () => {
    const about = layoutScreen(state({ tab: 'about' }), measure);
    const blog = layoutScreen(state({ tab: 'blog' }), measure);
    const pill = (layout: typeof about, tab: string) => {
      const zone = layout.zones.find((z) => z.kind === 'tab' && z.tab === tab)!;
      return layout.ops.filter((op) => op.type === 'rect' && op.x === zone.x0 && op.y === zone.y0);
    };
    expect(pill(about, 'about')).toHaveLength(1);
    expect(pill(about, 'blog')).toHaveLength(0);
    expect(pill(blog, 'blog')).toHaveLength(1);
    expect(pill(blog, 'about')).toHaveLength(0);
  });

  it('draws a dark screen at night and a light one by day', () => {
    const background = (lighting: 'day' | 'night') => {
      const first = layoutScreen(state({ lighting }), measure).ops[0];
      return first.type === 'rect' ? first.color : '';
    };
    expect(background('day')).toBe('#f3f4f6');
    expect(background('night')).toBe('#0c0e12');
  });

  it('breaks the Identity Statement into lines that fit, losing no word', () => {
    const long = Array.from({ length: 40 }, (_, index) => `word${index}`).join(' ');
    const content: ScreenContent = { title: 'Ki Hyun Park', statement: long, items: [] };
    const drawn = texts(layoutScreen(state(), measure, content).ops);
    const lines = drawn.filter((op) => op.text.startsWith('word'));
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.x + measure(line.text, line.font)).toBeLessThanOrEqual(SCREEN_WIDTH - line.x);
    }
    expect(lines.map((line) => line.text).join(' ')).toBe(long);
  });

  it('shortens a name that would run into its tag', () => {
    const name = 'a_package_name_far_too_long_to_fit_in_one_column_of_the_screen';
    const content: ScreenContent = {
      title: 'Open Source',
      items: Array.from({ length: 4 }, (_, index) => ({
        name: index === 0 ? name : `short_${index}`,
        meta: 'Flutter',
        href: `https://example.com/${index}`,
      })),
    };
    const { ops, zones } = layoutScreen(state({ tab: 'open-source' }), measure, content);
    const drawn = texts(ops);
    const shortened = drawn.find((op) => op.text.endsWith('…'))!;
    const tag = drawn.find((op) => op.text === 'Flutter')!;
    expect(drawn.some((op) => op.text === name)).toBe(false);
    expect(name.startsWith(shortened.text.slice(0, -1))).toBe(true);
    expect(tag.align).toBe('right');
    expect(shortened.x + measure(shortened.text, shortened.font)).toBeLessThan(
      tag.x - measure(tag.text, tag.font),
    );
    expect(zones.filter((zone) => zone.kind === 'item')).toHaveLength(4);
  });
});
