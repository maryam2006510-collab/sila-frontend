// src/features/portfolio/ResaleSection.tsx
// Investor resale (Workflow 09, D40): holdings by karat (owned, offered, available), "offer for
// sale" with the server-set price shown as today's value, and my resale listings with suspend,
// re-activate and withdraw (confirmed). صِلة stays a broker: another investor buys the offer.

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Num } from '@/components/ui/Num';
import { Chip } from '@/components/ui/Chip';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { toast } from '@/components/ui/toastStore';
import { api, errorMessage } from '@/lib/api';
import { isolateFigures } from '@/lib/bidi';
import { livePriceFor } from '@/lib/pricing';
import { queryKeys, useMyResales } from '@/lib/queries';
import { fmtGrams } from '@/lib/formatters';
import type { AssetListing, KaratBalance, ListingStatus, MarketPrices } from '@/lib/types';
import { useT } from '@/i18n';

const STATUS_BADGE: Record<ListingStatus, BadgeVariant> = {
  active: 'success',
  suspended: 'suspended',
  sold_out: 'soldOut',
  withdrawn: 'neutral',
};

const SellDialog: React.FC<{
  balance: KaratBalance | null;
  prices: MarketPrices;
  onClose: () => void;
}> = ({ balance, prices, onClose }) => {
  const t = useT();
  const s = t.resale;
  const queryClient = useQueryClient();
  const [grams, setGrams] = useState(0);
  // One key per dialog: a retried "publish" never creates a second offer
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const available = balance?.available_to_resell_grams ?? 0;
  const tooMuch = grams > available;

  const publish = useMutation({
    mutationFn: () => api.createResale(balance!.karat, grams, idempotencyKey),
    onSuccess: () => {
      toast.success(s.published);
      for (const key of [queryKeys.ownership, queryKeys.myResales, ['listings'], queryKeys.transactions]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      onClose();
    },
  });

  const value = balance
    ? new Decimal(grams || 0).times(livePriceFor(prices, balance.karat)).toDecimalPlaces(0).toNumber()
    : 0;

  return (
    <Dialog isOpen={Boolean(balance)} onClose={onClose} size="md" title={s.dialogTitle}>
      {balance && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Chip karat={balance.karat} />
            <p className="m-0 text-sm text-fg-muted">{s.dialogIntro}</p>
          </div>

          <MoneyInput
            label={s.gramsLabel}
            unit={t.units.grams}
            value={grams}
            onChangeValue={setGrams}
            max={available}
            error={tooMuch ? s.tooMuch : undefined}
            helperText={s.maxHint(fmtGrams(available))}
            suggestions={[available]}
            suggestionLabel={() => s.useMax}
          />

          <dl className="m-0 rounded-sm bg-muted border border-line-subtle px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-body text-fg-muted">{s.estimate}</dt>
              <dd className="m-0 text-h4 font-semibold text-fg">
                <Num value={value} format="iqd" />
              </dd>
            </div>
            <dd className="m-0 text-sm text-fg-subtle">{s.estimateHint}</dd>
          </dl>

          {publish.isError && (
            <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
              {isolateFigures(errorMessage(publish.error, s.publishFailed))}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              loading={publish.isPending}
              disabled={grams <= 0 || tooMuch}
              onClick={() => publish.mutate()}
            >
              {s.publish}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
};

const MyResale: React.FC<{ listing: AssetListing; onWithdraw: (l: AssetListing) => void }> = ({
  listing,
  onWithdraw,
}) => {
  const t = useT();
  const s = t.resale;
  const queryClient = useQueryClient();
  const change = useMutation({
    mutationFn: (status: 'active' | 'suspended') => api.setResaleStatus(listing.id, status),
    onSuccess: () => {
      toast.success(s.changed);
      for (const key of [queryKeys.ownership, queryKeys.myResales, ['listings']]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (err) => toast.danger(s.changeFailed, errorMessage(err, '')),
  });
  const open = listing.status === 'active' || listing.status === 'suspended';

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Chip karat={listing.karat} />
        <div className="min-w-0">
          <p className="m-0 text-body font-medium text-fg">
            {s.remaining(fmtGrams(listing.available_weight_grams), fmtGrams(listing.total_weight_grams))}
          </p>
          <Badge variant={STATUS_BADGE[listing.status]} icon={false}>
            {s.status[listing.status]}
          </Badge>
        </div>
      </div>
      {open && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="md"
            loading={change.isPending}
            onClick={() => change.mutate(listing.status === 'active' ? 'suspended' : 'active')}
          >
            {listing.status === 'active' ? s.suspend : s.activate}
          </Button>
          <Button variant="ghost" size="md" onClick={() => onWithdraw(listing)}>
            {s.withdraw}
          </Button>
        </div>
      )}
    </li>
  );
};

export const ResaleSection: React.FC<{ balances: KaratBalance[]; prices: MarketPrices }> = ({ balances, prices }) => {
  const t = useT();
  const s = t.resale;
  const queryClient = useQueryClient();
  const [selling, setSelling] = useState<KaratBalance | null>(null);
  const [toWithdraw, setToWithdraw] = useState<AssetListing | null>(null);
  const resales = useMyResales(true);

  const withdraw = useMutation({
    mutationFn: (id: string) => api.setResaleStatus(id, 'withdrawn'),
    onSuccess: () => {
      toast.success(s.changed);
      setToWithdraw(null);
      for (const key of [queryKeys.ownership, queryKeys.myResales, ['listings']]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  if (balances.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="resale-title">
      <div>
        <h2 id="resale-title" className="text-h4 font-semibold text-fg m-0">
          {s.sectionTitle}
        </h2>
        <p className="m-0 text-sm text-fg-subtle">{s.sectionIntro}</p>
      </div>

      <Card padding="normal" className="gap-0">
        <ul className="m-0 p-0 list-none divide-y divide-line-subtle">
          {balances.map((b) => (
            <li key={b.karat} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <Chip karat={b.karat} />
              <dl className="m-0 flex flex-wrap gap-x-6 gap-y-1 flex-1 min-w-0">
                {(
                  [
                    [s.owned, b.owned_grams],
                    [s.reserved, b.reserved_grams],
                    [s.available, b.available_to_resell_grams],
                  ] as const
                ).map(([label, grams]) => (
                  <div key={label}>
                    <dt className="text-sm text-fg-subtle">{label}</dt>
                    <dd className="m-0 text-body font-semibold text-fg">
                      <Num value={grams} format="grams" />
                    </dd>
                  </div>
                ))}
              </dl>
              <Button
                variant="secondary"
                size="md"
                disabled={b.available_to_resell_grams <= 0}
                aria-label={s.sellKarat(b.karat)}
                onClick={() => setSelling(b)}
              >
                {s.sell}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      {resales.data && resales.data.length > 0 && (
        <Card padding="normal" className="gap-1">
          <h3 className="text-body font-semibold text-fg m-0">{s.myTitle}</h3>
          <ul className="m-0 p-0 list-none divide-y divide-line-subtle">
            {resales.data.map((l) => (
              <MyResale key={l.id} listing={l} onWithdraw={setToWithdraw} />
            ))}
          </ul>
        </Card>
      )}

      {/* The key resets the form (and its idempotency key) for every new offer */}
      <SellDialog key={selling?.karat ?? 'closed'} balance={selling} prices={prices} onClose={() => setSelling(null)} />

      <Dialog isOpen={Boolean(toWithdraw)} onClose={() => setToWithdraw(null)} size="sm" title={s.withdrawTitle}>
        <div className="flex flex-col gap-5">
          <p className="m-0 text-body text-fg-muted">{s.withdrawBody}</p>
          {withdraw.isError && (
            <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
              {isolateFigures(errorMessage(withdraw.error, s.changeFailed))}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setToWithdraw(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              loading={withdraw.isPending}
              onClick={() => toWithdraw && withdraw.mutate(toWithdraw.id)}
            >
              {s.withdrawConfirm}
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
};
