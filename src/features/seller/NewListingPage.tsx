// src/features/seller/NewListingPage.tsx
// New listing per UI Kit 08-ux §9 Screen 6.1 (workflow 06-أ): form + live card preview.
// The seller never sets a price: base_price_per_gram = live 24K × (karat / 24), server-side.

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { InfoIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Segmented, SegmentOption } from '@/components/ui/Segmented';
import { Num } from '@/components/ui/Num';
import { toast } from '@/components/ui/toastStore';
import { ListingCard } from '@/components/fin/ListingCard';
import { useAppContext } from '@/features/shell/appContext';
import { openKyc } from '@/features/kyc/kycStore';
import { api, hasErrorCode, isApiError } from '@/lib/api';
import { KARATS, livePriceFor } from '@/lib/pricing';
import { isolateFigures } from '@/lib/bidi';
import { Karat, AssetListing } from '@/lib/types';
import { useT } from '@/i18n';

export const NewListingPage: React.FC = () => {
  const t = useT();
  const n = t.newListing;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, prices } = useAppContext();

  const [weight, setWeight] = useState(0);
  const [karat, setKarat] = useState<Karat>(21);
  const [touched, setTouched] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const idempotency = useRef<{ draft: string; key: string }>({ draft: '', key: '' });

  const referencePrice = Math.round(livePriceFor(prices, karat));
  const weightError = touched && !(weight > 0) ? n.weightRequired : undefined;

  const karatOptions: SegmentOption<Karat>[] = KARATS.map((k) => ({ value: k, label: String(k) }));

  // The real 356 card, updating as the seller types
  const previewListing: AssetListing = {
    id: 'preview',
    seller_id: user.id,
    seller_name: user.full_name,
    seller_verified: user.kyc_verified,
    total_weight_grams: weight,
    available_weight_grams: weight,
    karat,
    base_price_per_gram: referencePrice,
    current_price_per_gram: referencePrice,
    status: 'active',
    is_promoted: false,
    promotion_expiry_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // KYC is enforced by the server on publish (403 KYC_NOT_VERIFIED); after verification the
  // SAME request is resent automatically with the SAME Idempotency-Key (contract §6), so a
  // retry can only ever return the listing already created.
  const publish = async () => {
    setTouched(true);
    if (!(weight > 0)) return;
    const draft = { total_weight_grams: weight, karat };
    const draftKey = `${karat}|${weight}`;
    // One key per draft: a changed draft is a new listing, the same draft reuses its key
    if (idempotency.current.draft !== draftKey) idempotency.current = { draft: draftKey, key: crypto.randomUUID() };
    const key = idempotency.current.key;
    setPublishing(true);
    setError('');
    try {
      await api.createListing(draft, key);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast.success(n.published);
      navigate('/app/listings');
    } catch (err) {
      if (hasErrorCode(err, 'KYC_NOT_VERIFIED')) {
        openKyc({
          role: 'seller',
          pendingAction: { type: 'create_listing', payload: draft, returnTo: '/app/listings/new' },
          onVerified: publish,
        });
      } else {
        setError(isApiError(err) && err.message ? err.message : n.publishFailed);
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-golden gap-8 items-start">
      <Card padding="spacious" className="gap-5">
        <h1 className="text-h3 md:text-h2 font-semibold text-fg m-0">{n.title}</h1>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-muted">{n.karat}</span>
          <Segmented
            options={karatOptions}
            value={karat}
            onChange={setKarat}
            name="new-listing-karat"
            ariaLabel={n.karat}
          />
        </div>

        <MoneyInput
          label={n.weight}
          unit={t.units.grams}
          value={weight}
          onChangeValue={(v) => {
            setWeight(v);
            setTouched(true);
          }}
          suggestions={[25, 50, 100, 250]}
          error={weightError}
        />

        {/* Reference price: read-only, computed from the live 24K price */}
        <div className="rounded-sm bg-muted border border-line-subtle p-4 flex flex-col gap-2">
          <p className="m-0 flex items-center justify-between gap-3">
            <span className="text-body text-fg-muted">{n.referencePrice}</span>
            <span className="text-h4 font-semibold text-fg">
              <Num value={referencePrice} format="iqd" />
            </span>
          </p>
          <p className="m-0 text-sm text-fg-subtle">{n.fairPricing}</p>
          <p className="m-0 flex items-center gap-2 text-sm text-fg-subtle">
            <InfoIcon size={16} className="shrink-0" aria-hidden="true" />
            {n.formula}
          </p>
        </div>

        <p className="m-0 flex items-center justify-between gap-3 text-body text-fg-subtle">
          {n.estimatedValue}
          <Num value={Math.round(Math.max(weight, 0) * referencePrice)} format="iqd" className="text-fg-muted" />
        </p>

        {error && (
          <p
            role="alert"
            className="m-0 p-3 rounded-sm bg-danger-bg border border-danger-line text-sm font-medium text-danger-fg"
          >
            {isolateFigures(error)}
          </p>
        )}

        <Button variant="accent" size="xl" fullWidth loading={publishing} onClick={publish}>
          {n.publish}
        </Button>
      </Card>

      <aside className="lg:sticky lg:top-24 flex flex-col gap-3">
        <p className="m-0 text-sm font-medium text-fg-muted">{n.previewLabel}</p>
        <ListingCard listing={previewListing} isSellerView preview />
      </aside>
    </div>
  );
};
