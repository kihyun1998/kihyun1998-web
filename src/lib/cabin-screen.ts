// The Cabin Screen's drawing: what each tab shows, from the same data as the
// Reading Home, laid out as a list of fills and texts on a 1600×1200 canvas
// with the zones a pointer can press. `layoutScreen` is a plain function of
// its inputs and a text-measuring function; `paintScreen` puts its result on
// a canvas.
// See docs/adr/0011-home-is-a-cabin-over-a-reading-home.md and
// docs/map/home-room.md ("The Cabin Screen").

import type { Lighting } from './cabin-rules';
import { HOME_LIMIT, HOME_SECTIONS, type HomeSectionId } from './home';
import { identityStatement, type Language } from './i18n';
import { openSourceLede, openSourceRows, type OpenSourceRow } from './open-source';
import { projects, projectsLede, type Project } from './projects';
import { BLOG_URL, GITHUB_URL } from './site';

export const SCREEN_WIDTH = 1600;
export const SCREEN_HEIGHT = 1200;

// One pressable row: where it leads, and the tag and description drawn with
// its name. An `href` starting with '/' stays on this site.
export type ScreenItem = { name: string; meta?: string; description?: string; href: string };

export type ScreenContent = {
  title: string;
  lede?: string;
  // The Identity Statement, on the About tab.
  statement?: string;
  items: ScreenItem[];
  // The full-list page of a capped list.
  seeAll?: string;
};

// The lists the tabs are filled from; the site's own unless given.
export type ScreenData = { openSource: OpenSourceRow[]; projects: Project[] };

const siteData: ScreenData = { openSource: openSourceRows, projects };

export function screenContent(
  tab: HomeSectionId,
  language: Language,
  data: ScreenData = siteData,
): ScreenContent {
  switch (tab) {
    case 'about':
      return { title: 'Ki Hyun Park', statement: identityStatement[language], items: [] };
    case 'open-source':
      return {
        title: 'Open Source',
        lede: openSourceLede,
        items: data.openSource.slice(0, HOME_LIMIT).map((row) => ({
          name: row.name,
          meta: row.kind === 'family' ? `${row.memberCount} packages` : row.ecosystem,
          href: row.href,
        })),
        seeAll: '/open-source',
      };
    case 'projects':
      return {
        title: 'Projects',
        lede: projectsLede,
        items: data.projects.slice(0, HOME_LIMIT).map(({ name, href, description }) => ({
          name,
          href,
          ...(description ? { description } : {}),
        })),
        seeAll: '/projects',
      };
    case 'blog':
      return { title: 'Blog', items: [{ name: 'blog.kihyun1998.com', href: BLOG_URL }] };
    case 'online':
      return {
        title: 'Online',
        items: [
          { name: 'GitHub', meta: 'kihyun1998', href: GITHUB_URL },
          { name: 'Blog', meta: 'blog.kihyun1998.com', href: BLOG_URL },
        ],
      };
  }
}

export type ScreenState = {
  tab: HomeSectionId;
  language: Language;
  lighting: Lighting;
  // The `key` of the zone under the pointer.
  hover: string | null;
  // The clock, as HH:MM.
  time: string;
  // The car's speed in km/h.
  speed: number;
};

// A pressable rectangle in canvas pixels: a tab, or an item and where it
// leads. `key` names it across layouts.
export type Zone = { key: string; x0: number; y0: number; x1: number; y1: number } & (
  | { kind: 'tab'; tab: HomeSectionId }
  | { kind: 'item'; href: string }
);

export type RectOp = {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  color: string;
};

// A line of text, vertically centred on `y`. `font` is a CSS font without its
// family.
export type TextOp = {
  type: 'text';
  text: string;
  x: number;
  y: number;
  font: string;
  color: string;
  align: 'left' | 'right';
};

export type ScreenOp = RectOp | TextOp;

export type Measure = (text: string, font: string) => number;

const PALETTES = {
  day: { back: '#f3f4f6', text: '#14161a', muted: '#6b717c', line: '#dfe2e7', hot: '#e3e6eb' },
  night: { back: '#0c0e12', text: '#eef0f4', muted: '#8a909b', line: '#232731', hot: '#1b1f28' },
};
const ACCENT = '#3e6ae1';
const ON_ACCENT = '#ffffff';

const PAD = 80;
const INNER = SCREEN_WIDTH - PAD * 2;
const COLUMN_GAP = 60;
const ROWS_PER_COLUMN = 3;
const ROW_HEIGHT = 130;
const FIRST_ROW = 570;

const STATUS_FONT = '500 40px';
const TAB_FONT = '600 42px';
const TITLE_FONT = '700 88px';
const LEDE_FONT = '400 38px';
const STATEMENT_FONT = '500 58px';
const NAME_FONT = '500 48px';
const META_FONT = '400 32px';
const DESCRIPTION_FONT = '400 30px';
const SEE_ALL_FONT = '500 40px';
const SEE_ALL = 'See all →';

// `text`, cut and ended with an ellipsis where it is wider than `width`.
function fit(text: string, font: string, width: number, measure: Measure) {
  if (measure(text, font) <= width) return text;
  let kept = text;
  while (kept.length > 1 && measure(`${kept}…`, font) > width) kept = kept.slice(0, -1);
  return `${kept}…`;
}

// `text` broken at spaces into lines no wider than `width`.
function wrap(text: string, font: string, width: number, measure: Measure) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const longer = line ? `${line} ${word}` : word;
    if (line && measure(longer, font) > width) {
      lines.push(line);
      line = word;
    } else {
      line = longer;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The whole screen for `state`: what to draw, back to front, and the zones.
export function layoutScreen(
  state: ScreenState,
  measure: Measure,
  content: ScreenContent = screenContent(state.tab, state.language),
): { ops: ScreenOp[]; zones: Zone[] } {
  const palette = PALETTES[state.lighting];
  const ops: ScreenOp[] = [];
  const zones: Zone[] = [];
  const rect = (x: number, y: number, width: number, height: number, radius: number, color: string) =>
    ops.push({ type: 'rect', x, y, width, height, radius, color });
  const text = (
    value: string,
    x: number,
    y: number,
    font: string,
    color: string,
    align: 'left' | 'right' = 'left',
  ) => ops.push({ type: 'text', text: value, x, y, font, color, align });

  rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0, palette.back);

  text(state.time, PAD, 70, STATUS_FONT, palette.muted);
  text(`${Math.round(state.speed)} km/h`, SCREEN_WIDTH - PAD, 70, STATUS_FONT, palette.muted, 'right');

  let tabX = PAD;
  for (const { id, title } of HOME_SECTIONS) {
    const key = `tab:${id}`;
    const width = measure(title, TAB_FONT) + 64;
    const open = id === state.tab;
    if (open || state.hover === key) rect(tabX, 130, width, 92, 46, open ? ACCENT : palette.hot);
    text(title, tabX + 32, 176, TAB_FONT, open ? ON_ACCENT : palette.text);
    zones.push({ kind: 'tab', tab: id, key, x0: tabX, y0: 130, x1: tabX + width, y1: 222 });
    tabX += width + 14;
  }

  text(content.title, PAD, 340, TITLE_FONT, palette.text);
  if (content.lede) text(content.lede, PAD, 432, LEDE_FONT, palette.muted);

  if (content.statement) {
    wrap(content.statement, STATEMENT_FONT, INNER, measure).forEach((line, index) =>
      text(line, PAD, 490 + index * 84, STATEMENT_FONT, palette.text),
    );
  }

  const columns = content.items.length > ROWS_PER_COLUMN ? 2 : 1;
  const columnWidth = (INNER - (columns - 1) * COLUMN_GAP) / columns;
  content.items.forEach((item, index) => {
    const x = PAD + Math.floor(index / ROWS_PER_COLUMN) * (columnWidth + COLUMN_GAP);
    const y = FIRST_ROW + (index % ROWS_PER_COLUMN) * ROW_HEIGHT;
    const key = `item:${item.href}`;
    const zone = { x0: x - 24, y0: y - 58, x1: x + columnWidth, y1: y + 58 };
    const hot = state.hover === key;
    if (hot) rect(zone.x0, zone.y0, zone.x1 - zone.x0, zone.y1 - zone.y0, 20, palette.hot);

    const right = x + columnWidth - 20;
    const room = right - x - (item.meta ? measure(item.meta, META_FONT) + 40 : 0);
    const nameY = item.description ? y - 20 : y;
    text(fit(item.name, NAME_FONT, room, measure), x, nameY, NAME_FONT, hot ? ACCENT : palette.text);
    if (item.description) {
      text(fit(item.description, DESCRIPTION_FONT, room, measure), x, y + 28, DESCRIPTION_FONT, palette.muted);
    }
    if (item.meta) text(item.meta, right, y, META_FONT, palette.muted, 'right');
    rect(x, y + 63, columnWidth - 10, 2, 0, palette.line);
    zones.push({ kind: 'item', href: item.href, key, ...zone });
  });

  if (content.seeAll) {
    const key = `item:${content.seeAll}`;
    const y = FIRST_ROW + ROWS_PER_COLUMN * ROW_HEIGHT + 30;
    const width = measure(SEE_ALL, SEE_ALL_FONT) + 48;
    const zone = { x0: PAD - 24, y0: y - 44, x1: PAD - 24 + width, y1: y + 44 };
    const hot = state.hover === key;
    if (hot) rect(zone.x0, zone.y0, width, 88, 20, palette.hot);
    text(SEE_ALL, PAD, y, SEE_ALL_FONT, hot ? ACCENT : palette.muted);
    zones.push({ kind: 'item', href: content.seeAll, key, ...zone });
  }

  return { ops, zones };
}

// The zone holding the canvas point (x, y), or null.
export function zoneAt(zones: Zone[], x: number, y: number): Zone | null {
  return zones.find((zone) => x >= zone.x0 && x <= zone.x1 && y >= zone.y0 && y <= zone.y1) ?? null;
}

// Draws `ops` in order, with texts in `family`.
export function paintScreen(context: CanvasRenderingContext2D, ops: ScreenOp[], family: string) {
  context.textBaseline = 'middle';
  for (const op of ops) {
    context.fillStyle = op.color;
    if (op.type === 'text') {
      context.font = `${op.font} ${family}`;
      context.textAlign = op.align;
      context.fillText(op.text, op.x, op.y);
    } else if (op.radius > 0) {
      context.beginPath();
      context.roundRect(op.x, op.y, op.width, op.height, op.radius);
      context.fill();
    } else {
      context.fillRect(op.x, op.y, op.width, op.height);
    }
  }
}
