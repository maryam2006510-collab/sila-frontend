// src/features/seller/SellerListingsPage.tsx
// My listings per UI Kit 08-ux §9 Screen 6.2 + Dialog 6.3 (workflow 06-ب, 06-ج)
// No delete (audit trail): withdrawal happens through the status only.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon, MegaphoneIcon, PauseCircleIcon, PlayCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { Table, Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Tooltip } from '@/components/ui/Tooltip';
import { Num } from '@/components/ui/Num';
import { toast } from '@/components/ui/toastStore';
import { ErrorState } from '@/components/ui/ErrorState';
import { api, isApiError } from '@/lib/api';
import { useMyListings } from '@/lib/queries';
import { useServerConfig } from '@/lib/queries';
import { isolateFigures } from '@/lib/bidi';
import { fmtIQD } from '@/lib/formatters';
import { AssetListing } from '@/lib/types';
import { useNow } from '@/lib/hooks';
import { promotionDaysLeft as daysLeftAt } from '@/lib/status';
import { useT } from '@/i18n';

export const SellerListingsPage: React.FC = () => {
  const t = useT();
  const s = t.sellerListings;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listingsQuery = useMyListings();
  const listings = listingsQuery.data ?? [];
  // Promotion fee and length from GET /api/config (displayed, never hard-coded)
  const config = useServerConfig().data;
  const promotionFee = config?.promotion_fee_iqd;
  const promotionDays = config?.promotion_duration_days ?? 0;
  const now = useNow(60_000);
  const promotionDaysLeft = (l: AssetListing) => daysLeftAt(l, now);

  const [toSuspend, setToSuspend] = useState<AssetListing | null>(null);
  const [toPromote, setToPromote] = useState<AssetListing | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['listings'] });
  const errorText = (err: unknown, fallback: string) => (isApiError(err) && err.message ? err.message : fallback);

  const setStatus = async (listing: AssetListing, status: 'active' | 'suspended') => {
    setBusy(true);
    setDialogError('');
    try {
      await api.updateListingStatus(listing.id, status);
      await refresh();
      setToSuspend(null);
      toast.success(status === 'active' ? s.reactivated : s.suspended);
    } catch (err) {
      if (status === 'suspended') setDialogError(errorText(err, s.statusFailed));
      else toast.danger(s.statusFailed, errorText(err, ''));
    } finally {
      setBusy(false);
    }
  };

  const promote = async () => {
    if (!toPromote) return;
    setBusy(true);
    setDialogError('');
    try {
      await api.promoteListing(toPromote.id);
      await refresh();
      setToPromote(null);
      toast.success(s.promoted);
    } catch (err) {
      // Mock payment failed: the listing stays unpromoted (workflow 06-ب)
      setDialogError(errorText(err, s.promoteFailed));
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = (row: AssetListing) => {
    if (row.status === 'sold_out') return <Badge variant="soldOut">{t.status.soldOut}</Badge>;
    if (row.status === 'suspended') return <Badge variant="suspended">{t.status.suspended}</Badge>;
    return <Badge variant="success">{t.status.active}</Badge>;
  };

  const promotionCell = (row: AssetListing) => {
    const days = promotionDaysLeft(row);
    return days ? <Badge variant="promoted">{s.promotedLeft(days)}</Badge> : <span className="text-fg-subtle">-</span>;
  };

  const actions = (row: AssetListing) => (
    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      {row.status === 'active' && !promotionDaysLeft(row) && (
        <Button variant="secondary" size="sm" icon={<MegaphoneIcon size={16} />} onClick={() => setToPromote(row)}>
          {s.promote}
        </Button>
      )}
      {row.status === 'active' && (
        <Button variant="secondary" size="sm" icon={<PauseCircleIcon size={16} />} onClick={() => setToSuspend(row)}>
          {s.suspend}
        </Button>
      )}
      {row.status === 'suspended' && (
        <Button
          variant="secondary"
          size="sm"
          icon={<PlayCircleIcon size={16} />}
          loading={busy}
          onClick={() => setStatus(row, 'active')}
        >
          {s.reactivate}
        </Button>
      )}
      <Tooltip content={s.noDelete}>
        {/* aria-disabled, not disabled: it stays focusable/hoverable so the reason can show */}
        <Button
          variant="ghost"
          size="sm"
          icon={<TrashIcon size={16} />}
          aria-disabled="true"
          aria-label={`${s.delete}. ${s.noDelete}`}
          onClick={(e) => e.preventDefault()}
        >
          {s.delete}
        </Button>
      </Tooltip>
    </div>
  );

  const columns: Column<AssetListing>[] = [
    {
      key: 'title',
      header: s.colListing,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-fg">{t.listing.title(row.karat)}</span>
          <span className="text-sm text-fg-subtle">{t.units.karat(row.karat)}</span>
        </div>
      ),
    },
    {
      key: 'weight',
      header: s.colWeight,
      align: 'end',
      render: (row) => (
        <span className="font-medium">
          <Num value={row.available_weight_grams} format="grams" /> <span className="text-fg-subtle">/</span>{' '}
          <Num value={row.total_weight_grams} format="grams" />
        </span>
      ),
    },
    { key: 'status', header: s.colStatus, render: statusBadge },
    { key: 'promotion', header: s.colPromotion, render: promotionCell },
    { key: 'actions', header: s.colActions, align: 'end', render: actions },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <Button variant="accent" size="lg" icon={<PlusIcon size={20} />} onClick={() => navigate('/app/listings/new')}>
          {t.dashboard.addListing}
        </Button>
      </div>

      {listingsQuery.isError ? (
        <ErrorState message={s.loadFailed} onRetry={() => listingsQuery.refetch()} />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden lg:block rounded-md bg-surface-1 border border-line overflow-hidden">
            <Table
              columns={columns}
              data={listings}
              keyExtractor={(row) => row.id}
              loading={listingsQuery.isPending}
              emptyMessage={s.empty}
              caption={s.title}
            />
          </div>

          {/* Mobile: cards */}
          <ul className="lg:hidden m-0 p-0 list-none flex flex-col gap-3">
            {listingsQuery.isPending && <li className="h-g3 rounded-md skeleton-loading" aria-hidden="true" />}
            {!listingsQuery.isPending && listings.length === 0 && (
              <li className="p-5 rounded-md bg-surface-1 border border-line text-body text-fg-subtle text-center">
                {s.empty}
              </li>
            )}
            {listings.map((row) => (
              <li key={row.id} className="p-5 rounded-md bg-surface-1 border border-line flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-body font-semibold text-fg truncate">{t.listing.title(row.karat)}</p>
                    <p className="m-0 text-sm text-fg-subtle">
                      <Num value={row.available_weight_grams} format="grams" /> /{' '}
                      <Num value={row.total_weight_grams} format="grams" />
                    </p>
                  </div>
                  {statusBadge(row)}
                </div>
                {promotionDaysLeft(row) && promotionCell(row)}
                <div className="flex flex-wrap justify-start gap-2">{actions(row)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Suspend confirmation (dialog sm) */}
      <Dialog
        isOpen={Boolean(toSuspend)}
        onClose={() => {
          setToSuspend(null);
          setDialogError('');
        }}
        size="sm"
        title={s.suspendTitle}
      >
        <div className="flex flex-col gap-5">
          <p className="m-0 text-body text-fg-muted">{s.suspendBody}</p>
          {dialogError && (
            <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
              {isolateFigures(dialogError)}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setToSuspend(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => toSuspend && setStatus(toSuspend, 'suspended')}>
              {s.suspendConfirm}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Promote (dialog md, mock payment): the fee is shown before paying */}
      <Dialog
        isOpen={Boolean(toPromote)}
        onClose={() => {
          setToPromote(null);
          setDialogError('');
        }}
        size="md"
        title={s.promoteTitle}
      >
        <div className="flex flex-col gap-5">
          <p className="m-0 text-body text-fg-muted">{s.promoteBody}</p>
          <dl className="m-0 rounded-sm bg-muted border border-line-subtle px-4 py-2">
            <div className="flex items-center justify-between gap-3 h-11">
              <dt className="text-body text-fg-muted">{s.fee}</dt>
              <dd className="m-0 text-body font-semibold text-fg">
                {promotionFee === undefined ? (
                  <span className="inline-block h-4 w-16 align-middle rounded-xs skeleton-loading" aria-hidden="true" />
                ) : (
                  <Num value={promotionFee} format="iqd" />
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 h-11">
              <dt className="text-body text-fg-muted">{s.duration}</dt>
              <dd className="m-0 text-body font-semibold text-fg">{s.days(promotionDays)}</dd>
            </div>
          </dl>
          <Badge variant="info" className="self-start">
            {s.mockPayment}
          </Badge>
          {dialogError && (
            <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
              {isolateFigures(dialogError)}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setToPromote(null)}>
              {t.common.cancel}
            </Button>
            <Button variant="accent" loading={busy} disabled={promotionFee === undefined} onClick={promote}>
              {s.payAndActivate} · <bdi className="num">{fmtIQD(promotionFee ?? 0)}</bdi> {t.units.iqd}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
