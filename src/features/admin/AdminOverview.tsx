// src/features/admin/AdminOverview.tsx
// The admin's home (D43): the platform at a glance. Counts and sums come from the server;
// pending password requests get a direct way in, since someone is waiting on them.

import React from 'react';
import {
  BuildingsIcon,
  CoinsIcon,
  CrownIcon,
  KeyIcon,
  ReceiptIcon,
  StorefrontIcon,
  UserIcon,
  UsersIcon,
} from '@phosphor-icons/react';
import { KpiCard } from '@/components/fin/KpiCard';
import { Card } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { Num } from '@/components/ui/Num';
import { useAdminOverview } from '@/lib/queries';
import { dataStatus } from '@/lib/queryStatus';
import { useT } from '@/i18n';

export const AdminOverview: React.FC = () => {
  const t = useT();
  const a = t.admin;
  const overview = useAdminOverview();
  const status = dataStatus(overview);
  const o = overview.data;
  const count = (v: number | undefined) => <Num value={v ?? 0} format="plain" standalone countUp />;

  return (
    <div className="flex flex-col gap-8">
      {o && o.pending_password_requests > 0 && (
        <Card padding="normal" className="flex-row flex-wrap items-center justify-between gap-4 border-warning-line">
          <div className="flex items-center gap-3">
            <KeyIcon size={24} className="text-warning-fg shrink-0" aria-hidden="true" />
            <p className="m-0 text-body font-medium text-fg">
              {a.requests}: <Num value={o.pending_password_requests} format="plain" />
            </p>
          </div>
          <ButtonLink to="/app/admin/password-requests" variant="secondary" size="md">
            {a.openRequests}
          </ButtonLink>
        </Card>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="admin-overview-title">
        <h2 id="admin-overview-title" className="text-h4 font-semibold text-fg m-0">
          {a.overviewTitle}
        </h2>
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <KpiCard
            label={a.investors}
            icon={UsersIcon}
            status={status}
            value={count(o?.investors)}
            deltaLabel={o && o.inactive_accounts > 0 ? a.inactive(o.inactive_accounts) : undefined}
          />
          <KpiCard label={a.sellers} icon={UserIcon} status={status} value={count(o?.sellers)} />
          <KpiCard
            label={a.activeListings}
            icon={StorefrontIcon}
            status={status}
            value={count(o?.active_listings)}
            deltaLabel={o && o.active_resale_listings > 0 ? a.resaleShare(o.active_resale_listings) : undefined}
          />
          <KpiCard label={a.transactions} icon={ReceiptIcon} status={status} value={count(o?.transactions)} />
          <KpiCard
            label={a.volume}
            icon={CoinsIcon}
            status={status}
            value={<Num value={o?.volume_iqd ?? 0} format="iqd" standalone countUp />}
          />
          <KpiCard
            label={a.commission}
            icon={CoinsIcon}
            status={status}
            value={<Num value={o?.commission_iqd ?? 0} format="iqd" standalone countUp />}
          />
          <KpiCard label={a.premium} icon={CrownIcon} status={status} value={count(o?.premium_active)} />
          <KpiCard
            label={a.interest}
            icon={BuildingsIcon}
            status={status}
            value={count(o ? o.interest.real_estate + o.interest.oil : undefined)}
            deltaLabel={o ? a.interestSplit(o.interest.real_estate, o.interest.oil) : undefined}
          />
        </div>
      </section>
    </div>
  );
};
