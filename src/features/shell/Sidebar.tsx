// src/features/shell/Sidebar.tsx
// Desktop sidebar per UI Kit 04-layout §9: 272 expanded / 84 collapsed (collapsed by default below 1280).

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  SidebarSimpleIcon,
  SealCheckIcon,
  SignOutIcon,
  UserCircleIcon,
  ArrowsLeftRightIcon,
} from '@phosphor-icons/react';
import { Logo } from '@/components/ui/Logo';
import { StateIcon } from '@/components/ui/StateIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import { useMirrored } from '@/lib/direction';
import { isPremiumActive } from '@/lib/status';
import { User } from '@/lib/types';
import { useT } from '@/i18n';
import { sidebarItems } from './navItems';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  // Mock mode only
  onSwitchRole?: () => void;
}

const startsCollapsed = () => !window.matchMedia?.('(min-width: 1280px)').matches;

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, onSwitchRole }) => {
  const t = useT();
  const mirrored = useMirrored();
  const [collapsed, setCollapsed] = useState(startsCollapsed);

  const isInvestor = user.role === 'investor';
  const hasPremium = isPremiumActive(user);

  const collapseToggle = (
    <button
      type="button"
      onClick={() => setCollapsed(!collapsed)}
      aria-label={collapsed ? t.shell.expandSidebar : t.shell.collapseSidebar}
      aria-expanded={!collapsed}
      className="size-11 inline-flex items-center justify-center rounded-sm text-sidebar-fg-muted hover:text-sidebar-fg hover:bg-sidebar-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 transition-colors dur-2 ease-standard"
    >
      <SidebarSimpleIcon size={24} mirrored={mirrored} />
    </button>
  );

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-header bg-sidebar text-sidebar-fg ${
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      }`}
    >
      {/* Logo zone aligned with the 64px topbar */}
      <div
        className={`h-topbar flex items-center shrink-0 border-b border-sidebar-line ${
          collapsed ? 'justify-center' : 'justify-between ps-5 pe-3'
        }`}
      >
        {collapsed ? (
          <Logo variant="icon" tone="white" height={32} linkHome />
        ) : (
          <>
            <Logo variant="full" tone="white" height={32} linkHome />
            {collapseToggle}
          </>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto" aria-label={t.shell.nav.dashboard}>
        {sidebarItems(user.role).map((item) => {
          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 h-control-lg rounded-sm text-label font-medium select-none outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 transition-colors dur-2 ease-standard ${
                  collapsed ? 'justify-center px-0' : 'px-3'
                } ${isActive ? 'bg-sidebar-active text-sidebar-fg font-semibold' : 'text-sidebar-fg-muted hover:text-sidebar-fg hover:bg-sidebar-hover'}`
              }
            >
              {({ isActive }) => (
                <>
                  <StateIcon
                    icon={item.icon}
                    active={isActive}
                    size={collapsed ? 24 : 20}
                    mirrored={item.mirror && mirrored}
                    className={item.premium ? 'text-gold' : undefined}
                  />
                  {!collapsed && <span className="flex-1 truncate text-start">{item.label}</span>}
                  {!collapsed && item.premium && !hasPremium && (
                    <span className="h-6 px-2 inline-flex items-center rounded-xs text-sm font-medium border border-sidebar-line text-sidebar-fg-muted">
                      {t.shell.newBadge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );

          // Collapsed items keep their label as a tooltip (03-icon §9)
          return collapsed ? (
            <Tooltip key={item.to} content={item.label} className="w-full">
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      {/* Account block: name, role, verification status */}
      <div className="p-3 border-t border-sidebar-line shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            {collapseToggle}
            <UserCircleIcon size={24} className="text-sidebar-fg-muted" aria-label={user.full_name} />
            <button
              type="button"
              onClick={onLogout}
              aria-label={t.shell.logout}
              className="size-11 inline-flex items-center justify-center rounded-sm text-sidebar-fg-muted hover:text-sidebar-fg hover:bg-sidebar-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
            >
              <SignOutIcon size={24} mirrored={mirrored} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 min-w-0 px-1">
              <UserCircleIcon size={32} className="shrink-0 text-sidebar-fg-muted" aria-hidden="true" />
              <div className="min-w-0 text-start">
                <p className="m-0 text-body font-semibold text-sidebar-fg truncate flex items-center gap-1">
                  <span className="truncate">{user.full_name}</span>
                  {user.kyc_verified && (
                    <SealCheckIcon size={16} weight="fill" className="shrink-0" aria-label={t.shell.verified} />
                  )}
                </p>
                <p className="m-0 text-sm text-sidebar-fg-muted truncate">
                  {isInvestor ? t.shell.roleInvestor : t.shell.roleSeller}
                  {!user.kyc_verified && ` · ${t.shell.notVerified}`}
                </p>
              </div>
            </div>

            {/* Stacked, one action per row: both labels stay on one line */}
            <div className="flex flex-col">
              {onSwitchRole && (
                <button
                  type="button"
                  onClick={onSwitchRole}
                  className="inline-flex items-center gap-2 h-control-md px-2 rounded-sm text-sm font-medium text-sidebar-fg-muted hover:text-sidebar-fg hover:bg-sidebar-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
                >
                  <ArrowsLeftRightIcon size={16} aria-hidden="true" />
                  {t.shell.switchDemoAccount}
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 h-control-md px-2 rounded-sm text-sm font-medium text-sidebar-fg-muted hover:text-sidebar-fg hover:bg-sidebar-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
              >
                <SignOutIcon size={16} mirrored={mirrored} aria-hidden="true" />
                {t.shell.logout}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
