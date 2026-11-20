import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_MAX_LENGTH,
  projects,
  validateProjects,
  type Project,
} from './projects';

describe('validateProjects', () => {
  it('accepts a Project with no description', () => {
    const entries: Project[] = [{ name: 'Bare', href: 'https://example.test' }];

    expect(validateProjects(entries)).toEqual(entries);
  });

  it('accepts a short clause', () => {
    const entries: Project[] = [
      {
        name: 'Something',
        href: 'https://example.test',
        description: 'Turns spreadsheets into charts',
      },
    ];

    expect(validateProjects(entries)).toEqual(entries);
  });

  it('rejects a description longer than the limit', () => {
    const entries: Project[] = [
      {
        name: 'Wordy',
        href: 'https://example.test',
        description: 'x'.repeat(DESCRIPTION_MAX_LENGTH + 1),
      },
    ];

    expect(() => validateProjects(entries)).toThrow(/Wordy/);
  });

  it('rejects a description written as a full sentence', () => {
    const entries: Project[] = [
      {
        name: 'Formal',
        href: 'https://example.test',
        description: 'It turns spreadsheets into charts.',
      },
    ];

    expect(() => validateProjects(entries)).toThrow(/clause/i);
  });

  it('rejects an empty description, which should be omitted instead', () => {
    const entries: Project[] = [
      { name: 'Blank', href: 'https://example.test', description: '   ' },
    ];

    expect(() => validateProjects(entries)).toThrow(/Blank/);
  });
});

describe('the curated Projects', () => {
  it('satisfies every description rule', () => {
    expect(() => validateProjects(projects)).not.toThrow();
  });
});
