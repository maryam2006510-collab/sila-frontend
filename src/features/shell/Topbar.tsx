// src/features/shell/Topbar.tsx
// App topbar per UI Kit 04-layout §9 & 08-ux §2.2: title, live price chip, theme, notifications.
// Solid canvas background (no blur in the app). KYC is not nagged here (08-ux §4 Screen 1.4).

import React from 'react';
import { MoonIcon, SunIcon, BellIcon } from '@phosphor-icons/react';
import { Logo } from '@/components/ui/Logo';
import { LivePriceChip } from '@/components/fin/LivePriceChip';
import { useThemeStore } from '@/app/theme';
import { MarketPrices } from '@/lib/types';
import { useT } from '@/i18n';

interface TopbarProps {
  title: string;
  // Shown on phones instead of `title` when the full one would truncate
  short?: string;
  prices?: MarketPrices;
}

const iconButton =
  'size-11 inline-flex items-center justify-center rounded-sm text-fg-muted hover:text-fg hover:bg-state-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 transition-colors dur-2 ease-standard';

export const Topbar: React.FC<TopbarProps> = ({ title, short, prices }) => {
  const t = useT();
  const { theme, toggleTheme } = useThemeStore();
  const themeLabel = theme === 'dark' ? t.shell.themeToLight : t.shell.themeToDark;

  return (
    <header className="h-14 lg:h-topbar sticky top-0 z-header bg-canvas border-b border-line-subtle flex items-center justify-between gap-3 px-4 md:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <span className="lg:hidden shrink-0">
          <Logo variant="icon" tone="auto" height={28} linkHome />
        </span>
        {/* One step smaller on phones so titles like "مراجعة وتأكيد الشراء" fit beside the price chip */}
        <h1 className="text-body lg:text-h4 font-semibold text-fg m-0 truncate">
          {short ? (
            <>
              <span className="sm:hidden">{short}</span>
              <span className="max-sm:hidden">{title}</span>
            </>
          ) : (
            title
          )}
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {prices ? (
          <LivePriceChip prices={prices} />
        ) : (
          <span className="w-g3 h-control-sm rounded-xs skeleton-loading" aria-hidden="true" />
        )}

        <button type="button" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel} className={iconButton}>
          {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
        </button>

        <span className="hidden sm:contents">
          <button type="button" aria-label={t.shell.notifications} title={t.shell.notifications} className={iconButton}>
            <BellIcon size={20} />
          </button>
        </span>
      </div>
    </header>
  );
};
