// src/features/auth/AuthShell.tsx
// T4 focused-form layout (UI Kit 04-layout §10): form 1.618fr at the inline-start (the focal
// column) + navy brand panel 1fr. Mobile: the panel collapses to a 136px header band.

import React from 'react';
import { BroadcastIcon, ShieldCheckIcon, SignatureIcon } from '@phosphor-icons/react';
import { Logo } from '@/components/ui/Logo';
import { useT } from '@/i18n';

export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT();
  const points = [
    { icon: BroadcastIcon, text: t.auth.trustLive },
    { icon: ShieldCheckIcon, text: t.auth.trustSafe },
    { icon: SignatureIcon, text: t.auth.trustSigned },
  ];

  return (
    <div className="min-h-screen bg-canvas text-fg flex flex-col md:grid md:grid-cols-golden">
      {/* Mobile header band (136) */}
      <header className="md:hidden h-g2 bg-surface-brand text-fg-on-brand flex items-center px-5">
        <Logo variant="icon" tone="white" height={32} linkHome />
      </header>

      <main className="flex items-start md:items-center justify-center px-5 py-8 md:p-13">
        <div className="w-full max-w-g5 page-stagger">{children}</div>
      </main>

      <aside className="hidden md:flex flex-col justify-between bg-surface-brand text-fg-on-brand p-13 page-stagger">
        <Logo variant="full" tone="white" height={40} linkHome />
        <div className="flex flex-col gap-8">
          <p className="text-h3 font-semibold m-0">{t.auth.brandLine}</p>
          <ul className="m-0 p-0 list-none flex flex-col gap-5">
            {points.map(({ icon: IconComponent, text }) => (
              <li key={text} className="flex items-center gap-3 text-body font-medium">
                <IconComponent size={24} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <span />
      </aside>
    </div>
  );
};
