// Translatable Content. See CONTEXT.md and docs/adr/0001-language-strategy.md.
//
// English is the source of truth. The ONLY surface that has a Korean
// translation is the Identity Statement below. Everything else on the site
// (nav, project names, ecosystem tags, footer) is English-only. Adding a new
// key here means adding a new member to "Translatable Content" — that is an
// explicit decision, not a default.

export type Language = 'en' | 'ko';

// Note: the Identity Statement does not name ecosystems (Flutter/Rust/TS) —
// that is a hard constraint from the grill. It is about who Kihyun is, not
// what tools he uses.
export const identityStatement: Record<Language, string> = {
  en: "I'm a developer interested in defining problems and solving them.",
  ko: '문제를 정의하고 해결하는 데 관심 있는 개발자입니다.',
};
