import { describe, expect, it } from 'vitest';
import { identityStatement } from './i18n';

// The Identity Statement is the only Translatable Content, and the Language
// Toggle swaps it whole. A Korean version that lags the English by a sentence
// would show a visitor a shorter statement with no sign anything is missing —
// so the two are pinned to the same sentence count, and to the ceiling
// CONTEXT.md sets.

const SENTENCE_CEILING = 3;

const sentenceCount = (statement: string) =>
  statement.split(/[.!?]+\s*/).filter((part) => part.trim().length > 0).length;

describe('the Identity Statement', () => {
  it('says the same number of sentences in both languages', () => {
    expect(sentenceCount(identityStatement.ko)).toBe(
      sentenceCount(identityStatement.en),
    );
  });

  it('stays within the three-sentence ceiling', () => {
    expect(sentenceCount(identityStatement.en)).toBeLessThanOrEqual(
      SENTENCE_CEILING,
    );
  });
});
