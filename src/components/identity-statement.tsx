'use client';

import { useLanguage } from '@/components/language';
import { identityStatement } from '@/lib/i18n';

export function IdentityStatement() {
  const { language } = useLanguage();
  return (
    <p lang={language} className="text-lg leading-relaxed text-foreground">
      {identityStatement[language]}
    </p>
  );
}
