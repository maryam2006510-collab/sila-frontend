// src/features/landing/FinalCta.tsx
// Final CTA band (navy wash, its second and last allowed place) + footer (logo White 40)
// per UI Kit 08-ux §12 #11 & 05-logo §4.1.

import React from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { noOrphan } from '@/lib/noOrphan';
import { useT } from '@/i18n';

export const FinalCta: React.FC = () => {
  const t = useT();
  const l = t.landing;

  return (
    <>
      <section aria-label={l.finalCta.title} className="bg-wash cv-auto">
        <div className="container-landing px-5 md:px-8 xl:px-13 py-21 lg:py-34 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <p data-reveal className="m-0 max-w-g5 text-h2 sm:text-h1 font-bold text-fg">
            {noOrphan(l.finalCta.title)}
          </p>
          <ButtonLink data-gold-cta to="/signup" variant="accent" size="xl" className="self-start md:self-auto">
            {l.nav.openAccount}
          </ButtonLink>
        </div>
      </section>

      <footer id="landing-footer" className="border-t border-line-subtle cv-auto">
        <div className="container-landing px-5 md:px-8 xl:px-13 py-13 grid grid-cols-1 md:grid-cols-golden gap-8">
          <div className="flex flex-col gap-5">
            <Logo variant="full" tone="auto" height={40} linkHome />
            <p className="m-0 max-w-128 text-sm text-fg-subtle">{l.footer.legal}</p>
            <p className="m-0 text-sm text-fg-subtle">{l.footer.charts}</p>
          </div>
          <nav aria-label={l.footer.product}>
            <p className="m-0 mb-3 text-sm font-semibold text-fg-muted">{l.footer.product}</p>
            <ul className="m-0 p-0 list-none grid grid-cols-2 gap-3">
              {[
                ['#how', l.nav.how],
                ['#pricing', l.nav.prices],
                ['#security', l.nav.security],
                ['#sellers', l.nav.sellers],
                ['#faq', l.nav.faq],
                ['/login', l.nav.login],
              ].map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-body text-fg-muted hover:text-fg outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 rounded-xs"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
};
