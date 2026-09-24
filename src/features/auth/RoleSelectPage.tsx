// src/features/auth/RoleSelectPage.tsx
// Role choice per UI Kit 08-ux-user-flows.md §4 Screen 1.1 (workflow 01, step 1)

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { WalletIcon, StorefrontIcon, InfoIcon, Icon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { StateIcon } from '@/components/ui/StateIcon';
import { UserRole } from '@/lib/types';
import { useT } from '@/i18n';
import { AuthShell } from './AuthShell';

interface RoleOptionProps {
  icon: Icon;
  title: string;
  body: string;
  selected: boolean;
  onSelect: () => void;
}

// Fixed 220 option card; selected = 1.5px inset line + icon regular → fill
const RoleOption: React.FC<RoleOptionProps> = ({ icon, title, body, selected, onSelect }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className={`h-g3 p-5 rounded-md bg-surface-1 border text-start flex flex-col justify-between outline-none transition-control dur-3 ease-standard focus-visible:ring-3 focus-visible:ring-line-focus/35 ${
      selected ? 'border-transparent selected-ring bg-state-selected' : 'border-line hover:border-line-strong'
    }`}
  >
    <span className="size-16 inline-flex items-center justify-center rounded-md bg-muted border border-line-subtle text-state-indicator">
      <StateIcon icon={icon} active={selected} size={32} />
    </span>
    <span className="flex flex-col gap-1">
      <span className="text-h4 font-semibold text-fg">{title}</span>
      <span className="text-body text-fg-muted">{body}</span>
    </span>
  </button>
);

export const RoleSelectPage: React.FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  return (
    <AuthShell>
      <div className="flex flex-col gap-8">
        <h1 className="text-h3 md:text-h2 font-semibold text-fg m-0">{t.auth.roleTitle}</h1>

        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label={t.auth.roleTitle} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <RoleOption
              icon={WalletIcon}
              title={t.auth.investor}
              body={t.auth.investorBody}
              selected={selectedRole === 'investor'}
              onSelect={() => setSelectedRole('investor')}
            />
            <RoleOption
              icon={StorefrontIcon}
              title={t.auth.seller}
              body={t.auth.sellerBody}
              selected={selectedRole === 'seller'}
              onSelect={() => setSelectedRole('seller')}
            />
          </div>

          <p className="m-0 flex items-start gap-2 text-sm text-fg-subtle">
            <InfoIcon size={16} className="shrink-0 mt-1" aria-hidden="true" />
            {t.auth.roleFixedNote}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-5">
          <Link to="/login" className="text-body font-medium text-fg-link hover:text-fg-link-hover">
            {t.auth.haveAccount}
          </Link>
          <Button
            variant="primary"
            size="lg"
            disabled={!selectedRole}
            onClick={() => selectedRole && navigate(`/signup/${selectedRole}`)}
            className="w-full sm:w-auto sm:px-13"
          >
            {t.auth.continue}
          </Button>
        </div>
      </div>
    </AuthShell>
  );
};
