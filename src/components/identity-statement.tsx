'use client';

// The Identity Statement — the only Translatable Content on the site.
// Reads the current language and renders the matching sentence. The literal
// text lives in src/lib/i18n.ts; the constraints on it live in CONTEXT.md.

import { useLanguage } from '@/components/language';
import { identityStatement } from '@/lib/i18n';

export function IdentityStatement() {
  const { language } = useLanguage();
  return (
    <p className="text-lg leading-relaxed text-foreground">
      {identityStatement[language]}
    </p>
  );
}
