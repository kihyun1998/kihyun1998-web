export type Project = {
  name: string;
  href: string;
  description?: string;
};

export const DESCRIPTION_MAX_LENGTH = 60;

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

export const projects: Project[] = validateProjects([
  { name: 'Just Apps', href: 'https://just-apps-homepage.vercel.app' },
  { name: 'Just Insight', href: 'https://insight.kihyun1998.com' },
  { name: 'Just MLB', href: 'https://mlb.kihyun1998.com' },
  { name: 'Just PDF Web', href: 'https://just-pdf-web.vercel.app' },
  { name: 'Pricly', href: 'https://pricly.vercel.app' },
  { name: 'Just Roster', href: 'https://just-roster.vercel.app' },
]);

export const projectsLede = 'Services and applications you use directly';
