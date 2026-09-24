// src/features/shell/MobileTabBar.tsx
// Mobile bottom navigation per UI Kit 04-layout §9 & 08-ux §2.2: 4 items + "المزيد" (64 + safe area).

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { DotsThreeIcon, SignOutIcon } from '@phosphor-icons/react';
import { StateIcon } from '@/components/ui/StateIcon';
import { Sheet } from '@/components/ui/Sheet';
import { useMirrored } from '@/lib/direction';
import { UserRole } from '@/lib/types';
import { useT } from '@/i18n';
import { tabBarItems, moreItems } from './navItems';

interface MobileTabBarProps {
  role: UserRole;
  onLogout: () => void;
}

const tabClass = (active: boolean) =>
  `flex-1 h-full flex flex-col items-center justify-center gap-1 outline-none select-none focus-visible:bg-state-hover transition-colors dur-2 ease-standard ${
    active ? 'text-state-indicator font-semibold' : 'text-fg-subtle hover:text-fg font-medium'
  }`;

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ role, onLogout }) => {
  const t = useT();
  const mirrored = useMirrored();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const extra = moreItems(role);
  const moreActive = extra.some((item) => location.pathname.startsWith(item.to));

  return (
    <>
      <nav
        aria-label={t.shell.nav.dashboard}
        className="lg:hidden fixed bottom-0 inset-x-0 z-header bg-surface-1 border-t border-line pb-safe-bottom"
      >
        <div className="h-tabbar flex items-stretch">
          {tabBarItems(role).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <StateIcon icon={item.icon} active={isActive} size={24} mirrored={item.mirror && mirrored} />
                  <span className="text-sm whitespace-nowrap">{item.shortLabel ?? item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={tabClass(moreActive)}
            aria-haspopup="dialog"
          >
            <StateIcon icon={DotsThreeIcon} active={moreActive} size={24} />
            <span className="text-sm">{t.shell.nav.more}</span>
          </button>
        </div>
      </nav>

      <Sheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} title={t.shell.nav.more}>
        <ul className="m-0 p-0 list-none flex flex-col">
          {extra.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 h-16 px-2 rounded-sm text-label outline-none focus-visible:bg-state-hover ${
                    isActive ? 'text-state-indicator font-semibold' : 'text-fg font-medium hover:bg-state-hover'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <StateIcon
                      icon={item.icon}
                      active={isActive}
                      size={24}
                      mirrored={item.mirror && mirrored}
                      className={item.premium ? 'text-fg-gold' : undefined}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li className="mt-2 pt-2 border-t border-line-subtle">
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 h-16 px-2 rounded-sm text-label font-medium text-fg hover:bg-state-hover outline-none focus-visible:bg-state-hover"
            >
              <SignOutIcon size={24} mirrored={mirrored} aria-hidden="true" />
              {t.shell.logout}
            </button>
          </li>
        </ul>
      </Sheet>
    </>
  );
};
