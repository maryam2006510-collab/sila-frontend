// src/features/landing/Faq.tsx
// FAQ per UI Kit 08-ux §12 #10: accordion, max width 932, six questions.
// Native <details>/<summary>: keyboard and screen-reader support built in.

import React from 'react';
import { CaretDownIcon } from '@phosphor-icons/react';
import { isolateFigures } from '@/lib/bidi';
import { noOrphan } from '@/lib/noOrphan';
import { useT } from '@/i18n';

export const Faq: React.FC = () => {
  const t = useT();
  const f = t.landing.faq;

  return (
    <section
      id="faq"
      aria-label={f.title}
      className="landing-anchor cv-auto container-landing px-5 md:px-8 xl:px-13 py-21 lg:py-34"
    >
      <div className="max-w-g6 flex flex-col gap-8">
        <h2 data-reveal className="m-0 text-h2 sm:text-h1 lg:text-display-lg font-bold text-fg">
          {noOrphan(f.title)}
        </h2>
        <div className="flex flex-col border-t border-line">
          {f.items.map((item) => (
            <details data-reveal-item key={item.q} name="faq" className="group border-b border-line">
              <summary className="list-none flex items-center justify-between gap-5 min-h-16 py-3 cursor-pointer text-h4 font-semibold text-fg outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 rounded-xs">
                {item.q}
                <CaretDownIcon
                  size={24}
                  className="shrink-0 text-fg-muted transition-transform dur-3 ease-standard group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="m-0 pb-5 max-w-g5 text-h4 font-normal text-fg-muted">{isolateFigures(item.a)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
