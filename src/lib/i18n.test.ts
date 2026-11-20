import { describe, expect, it } from 'vitest';
import { identityStatement } from './i18n';

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
