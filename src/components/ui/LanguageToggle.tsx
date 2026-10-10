// src/components/ui/LanguageToggle.tsx
// Switches between Arabic and English (D45). The label is the other language, written in that
// language ("English" / "العربية"), so a reader of either can find it.

import React from 'react';
import { useLocaleStore } from '@/lib/direction';
import { useT } from '@/i18n';

export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);

  return (
    <button
      type="button"
      onClick={toggleLocale}
      lang={locale === 'ar' ? 'en' : 'ar'}
      title={t.shell.switchLanguage}
      className={`inline-flex items-center justify-center rounded-sm text-body font-medium outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 transition-colors dur-2 ease-standard ${className}`}
    >
      {t.shell.otherLanguage}
    </button>
  );
};
