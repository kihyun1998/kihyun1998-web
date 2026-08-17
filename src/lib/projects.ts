// The "Projects" section — standalone services/apps that a person uses directly
// (not building blocks). See CONTEXT.md ("Project", "Section Lede") and
// docs/adr/0004-open-source-vs-projects.md + 0008-home-introduces-the-person.md.
//
// Rules:
// - Hand-curated.
// - A card shows `name`, linking to `href`, plus an optional one-line
//   `description`. Unlike a Package, a Project's name is a product name and
//   carries no context of its own — ADR-0003 does not apply here.
// - The description is a clause, not a sentence, and is omitted rather than
//   invented when the name already says enough.

export type Project = {
  name: string;
  // Canonical destination: the live service URL.
  href: string;
  // Optional. A short clause saying what this is — no closing full stop.
  description?: string;
};

// Long enough for "Turns a roster spreadsheet into a lineup", short enough that
// rows keep an even rhythm.
export const DESCRIPTION_MAX_LENGTH = 60;

// A malformed description is invisible in the array below and would ship as a
// broken row, so it throws at module load — the same posture the Open Source
// Families take. Exported so tests can drive it with fixtures.
export function validateProjects(entries: Project[]): Project[] {
  for (const { name, description } of entries) {
    if (description === undefined) continue;

    if (description.trim().length === 0) {
      throw new Error(
        `Project "${name}" has a blank description; omit the field instead.`,
      );
    }
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      throw new Error(
        `Project "${name}" has a ${description.length}-character description; the limit is ${DESCRIPTION_MAX_LENGTH}.`,
      );
    }
    if (/[.!?]$/.test(description.trim())) {
      throw new Error(
        `Project "${name}" ends its description with punctuation; write a clause, not a sentence.`,
      );
    }
  }

  return entries;
}

// Descriptions are deliberately absent for now: they are Kihyun's words about
// his own services, and an invented one reads worse than none. The field is
// optional, so a Project without one renders exactly as it did before.
export const projects: Project[] = validateProjects([
  { name: 'Just Apps', href: 'https://just-apps-homepage.vercel.app' },
  { name: 'Just Insight', href: 'https://insight.kihyun1998.com' },
  { name: 'Just MLB', href: 'https://mlb.kihyun1998.com' },
  { name: 'Just PDF Web', href: 'https://just-pdf-web.vercel.app' },
  { name: 'Pricly', href: 'https://pricly.vercel.app' },
  { name: 'Just Roster', href: 'https://just-roster.vercel.app' },
]);

// Shown under the section heading. Lifted from CONTEXT.md's definition of
// Project so the site and the glossary say the same thing in the same words.
// English-only, per ADR-0001's default for any new text.
export const projectsLede = 'Services and applications you use directly';
