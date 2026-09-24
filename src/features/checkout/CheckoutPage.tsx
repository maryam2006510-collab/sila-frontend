// src/features/checkout/CheckoutPage.tsx
// Checkout per UI Kit 08-ux §8 (workflow 05) and API_CONTRACT.md §5:
// Quantity → preview (a signed quote, valid until quote_expires_at) → confirm → receipt.
// The price the user saw is the price they pay: confirm carries the quote_token, and one
// Idempotency-Key per confirmation screen is reused on every retry (never a double buy).

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, useBlocker, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, CheckCircleIcon, SealCheckIcon, InfoIcon, ArchiveIcon } from '@phosphor-icons/react';
import { Stepper, StepItem } from '@/components/ui/Stepper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Dialog } from '@/components/ui/Dialog';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Num } from '@/components/ui/Num';
import { OrderSummary } from '@/components/fin/OrderSummary';
import { ReceiptDetails } from '@/components/fin/ReceiptDetails';
import { OrderEstimate } from '@/components/fin/OrderEstimate';
import { gramsError } from '@/lib/validation';
import { AiInsight } from '@/components/fin/AiInsight';
import { useAppContext } from '@/features/shell/appContext';
import { openKyc } from '@/features/kyc/kycStore';
import { api, hasErrorCode, isApiError } from '@/lib/api';
import { useListing, queryKeys } from '@/lib/queries';
import { livePriceFor, estimateOrder } from '@/lib/pricing';
import { useServerConfig } from '@/lib/queries';
import { usePendingActionStore } from '@/lib/pendingAction';
import { useNow } from '@/lib/hooks';
import { isolateFigures } from '@/lib/bidi';
import { fmtNumber } from '@/lib/formatters';
import { useMirrored } from '@/lib/direction';
import { TransactionPreview, ConfirmResult, TransactionPreviewRequest } from '@/lib/types';
import { useT } from '@/i18n';
import { ListingLoadError } from '@/features/market/ListingLoadError';

type Step = 'quantity' | 'review' | 'done';
type ConfirmIssue =
  | { kind: 'insufficient'; message: string }
  | { kind: 'notActive' }
  | { kind: 'network' }
  | { kind: 'priceChanged' }
  | { kind: 'generic'; message: string };

const GRAM_CHIPS = [5, 10, 25, 50];

export const CheckoutPage: React.FC = () => {
  const t = useT();
  const c = t.checkout;
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const mirrored = useMirrored();
  const queryClient = useQueryClient();
  const { user, prices } = useAppContext();
  const { pendingAction, clearPendingAction } = usePendingActionStore();

  const listingQuery = useListing(listingId);
  const listing = listingQuery.data;

  // Quantity: restored from a preserved purchase intent (KYC/login interrupt), else from navigation state
  const restored =
    pendingAction?.type === 'purchase' && (pendingAction.payload as TransactionPreviewRequest).asset_id === listingId
      ? (pendingAction.payload as TransactionPreviewRequest).purchased_weight_grams
      : undefined;
  const initialGrams = restored ?? (location.state as { initialGrams?: number } | null)?.initialGrams ?? 10;

  const [step, setStep] = useState<Step>('quantity');
  const [grams, setGrams] = useState(initialGrams);
  const [preview, setPreview] = useState<TransactionPreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [issue, setIssue] = useState<ConfirmIssue | null>(null);
  const [kycInterrupted, setKycInterrupted] = useState(false);
  const [receipt, setReceipt] = useState<ConfirmResult | null>(null);
  const tiers = useServerConfig().data?.commission_tiers;

  // Contract §5: created once per confirmation screen (each preview) and reused on every retry
  // of that screen, including the automatic resend after KYC and a resend after a network error
  const idempotencyKey = useRef(crypto.randomUUID());
  const now = useNow(1_000);

  // Clamp once per listing when it arrives (adjusting state during render, not in an effect)
  const [clampedFor, setClampedFor] = useState<string | null>(null);
  if (listing && clampedFor !== listing.id) {
    setClampedFor(listing.id);
    if (grams > listing.available_weight_grams) setGrams(listing.available_weight_grams);
  }

  // Never leave the page while the money request is in flight (08-ux §8 Step 5.3)
  const blocker = useBlocker(confirming);
  useEffect(() => {
    if (!confirming) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [confirming]);

  if (!listing) {
    return listingQuery.isPending ? (
      <div className="grid grid-cols-1 lg:grid-cols-golden gap-8" aria-busy="true">
        <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
        <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
      </div>
    ) : (
      <ListingLoadError error={listingQuery.error} onRetry={() => listingQuery.refetch()} />
    );
  }

  const livePrice = livePriceFor(prices, listing.karat);
  const qtyError = gramsError(grams, listing.available_weight_grams, t);
  const order: TransactionPreviewRequest = { asset_id: listing.id, purchased_weight_grams: grams };

  // The quote expires at quote_expires_at (quote_ttl_seconds, 60 s): then it must be refreshed
  const isStale = Boolean(preview) && now >= new Date(preview!.quote_expires_at).getTime();

  const steps: StepItem[] = [
    { id: 'quantity', label: c.stepQuantity },
    { id: 'review', label: c.stepReview },
    { id: 'confirm', label: c.stepConfirm },
  ];
  const stepIndex = step === 'quantity' ? 0 : step === 'review' ? 1 : steps.length;

  // Step 1 → 2: the preview is the quote (breakdown + quote_token + risk_insight). It reserves
  // nothing and needs no KYC. `keepIssue` keeps a PRICE_CHANGED notice over the new numbers.
  const requestPreview = async (keepIssue = false) => {
    setPreviewing(true);
    setPreviewError('');
    if (!keepIssue) setIssue(null);
    try {
      const quote = await api.previewTransaction(order);
      setPreview(quote);
      // A new confirmation screen gets a new key (contract §5, "confirm again (new key)")
      idempotencyKey.current = crypto.randomUUID();
      setStep('review');
    } catch (err) {
      if (hasErrorCode(err, 'LISTING_NOT_ACTIVE')) {
        setIssue({ kind: 'notActive' });
        setStep('review');
      } else {
        setPreviewError(isApiError(err) && err.message ? err.message : c.previewFailed);
        queryClient.invalidateQueries({ queryKey: queryKeys.listing(listing.id) });
      }
    } finally {
      setPreviewing(false);
    }
  };

  // Step 3: confirm the quote. The request is exactly the quoted one (asset, grams, token).
  const confirm = async () => {
    if (!preview) return;
    setConfirming(true);
    setIssue(null);
    const quoted: TransactionPreviewRequest = {
      asset_id: preview.asset_id,
      purchased_weight_grams: preview.purchased_weight_grams,
    };
    try {
      const result = await api.confirmTransaction(quoted, preview.quote_token, idempotencyKey.current);
      setReceipt(result);
      setStep('done');
      clearPendingAction();
      queryClient.invalidateQueries({ queryKey: queryKeys.ownership });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.listing(listing.id) });
    } catch (err) {
      if (hasErrorCode(err, 'KYC_NOT_VERIFIED')) {
        // Contract §5: verify, then resend the SAME confirm (same key, same quote)
        setKycInterrupted(true);
        openKyc({
          role: 'investor',
          pendingAction: { type: 'purchase', payload: quoted, returnTo: location.pathname },
          onVerified: confirm,
        });
      } else if (hasErrorCode(err, 'PRICE_CHANGED')) {
        // Quote expired or no longer matches: new preview, new numbers, confirm again (new key)
        setIssue({ kind: 'priceChanged' });
        await requestPreview(true);
      } else if (hasErrorCode(err, 'INSUFFICIENT_AVAILABLE_WEIGHT')) {
        setIssue({ kind: 'insufficient', message: isApiError(err) ? err.message : '' });
        queryClient.invalidateQueries({ queryKey: queryKeys.listing(listing.id) });
      } else if (hasErrorCode(err, 'LISTING_NOT_ACTIVE')) {
        setIssue({ kind: 'notActive' });
      } else if (hasErrorCode(err, 'NETWORK_ERROR')) {
        // Outcome unknown: a resend with the SAME key returns the original transaction if it
        // went through (200), so retrying can never buy twice (contract §5)
        setIssue({ kind: 'network' });
      } else {
        setIssue({ kind: 'generic', message: isApiError(err) && err.message ? err.message : c.confirmFailed });
      }
    } finally {
      setConfirming(false);
    }
  };

  const backLink = (to: string, label: string) => (
    <Link
      to={to}
      className="self-start inline-flex items-center gap-2 text-body font-medium text-fg-link hover:text-fg-link-hover"
    >
      <ArrowLeftIcon size={16} mirrored={mirrored} aria-hidden="true" />
      {label}
    </Link>
  );

  // ---- Listing no longer active: full-step notice ----------------------
  if (issue?.kind === 'notActive') {
    return (
      <div className="mx-auto w-full max-w-g5 flex flex-col gap-5">
        <Card padding="spacious" className="items-center text-center gap-5">
          <span className="size-16 inline-flex items-center justify-center rounded-md bg-muted border border-line-subtle text-fg-muted">
            <ArchiveIcon size={32} aria-hidden="true" />
          </span>
          <h1 className="text-h3 font-semibold text-fg m-0">{c.notActive}</h1>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="lg" onClick={() => navigate(`/app/market?karat=${listing.karat}`)}>
              {c.similar}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate('/app/market')}>
              {t.detail.backToMarket}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- Receipt (Step 5.4): no confetti, the focus is the user's gold ----
  if (step === 'done' && receipt) {
    return (
      <div className="mx-auto w-full max-w-g5 flex flex-col gap-5">
        <Stepper steps={steps} currentStepIndex={stepIndex} />
        <Card padding="spacious" className="gap-5">
          <div className="flex flex-col items-center text-center gap-3">
            <CheckCircleIcon size={52} weight="fill" className="text-success-fg" aria-hidden="true" />
            <h1 className="text-h3 font-semibold text-fg m-0">{c.successTitle}</h1>
          </div>

          <div className="flex flex-col items-center gap-1 py-5 border-y border-line-subtle">
            <p className="m-0 text-body text-fg-muted">{c.newBalance}</p>
            <p className="m-0 text-h1 font-bold text-fg">
              <Num value={receipt.total_accumulated_grams} format="grams" standalone />
            </p>
            <p className="m-0 inline-flex items-center gap-1 text-sm font-medium text-success-fg">
              <SealCheckIcon size={16} weight="fill" aria-hidden="true" />
              {c.signed}
            </p>
          </div>

          <ReceiptDetails tx={receipt.transaction} viewer="investor" />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/app/portfolio')}>
              {c.viewPortfolio}
            </Button>
            <Button variant="ghost" size="lg" fullWidth onClick={() => navigate('/app/market')}>
              {c.keepShopping}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-24 lg:pb-0">
      {step === 'quantity' ? (
        backLink(`/app/market/${listing.id}`, c.cancel)
      ) : (
        <button
          type="button"
          onClick={() => setStep('quantity')}
          disabled={confirming}
          className="self-start inline-flex items-center gap-2 text-body font-medium text-fg-link hover:text-fg-link-hover disabled:text-fg-disabled"
        >
          <ArrowLeftIcon size={16} mirrored={mirrored} aria-hidden="true" />
          {c.editQuantity}
        </button>
      )}

      <Stepper steps={steps} currentStepIndex={stepIndex} />

      <div className="grid grid-cols-1 lg:grid-cols-golden gap-8 items-start">
        {/* Main column */}
        <div className="flex flex-col gap-5 min-w-0">
          <Card padding="normal" className="gap-3">
            <div className="flex items-center gap-2">
              <Chip karat={listing.karat} />
              <span className="text-sm text-fg-muted truncate">{listing.seller_name}</span>
            </div>
            <h1 className="text-h4 font-semibold text-fg m-0">{t.listing.title(listing.karat)}</h1>
            <p className="m-0 text-body text-fg-muted">
              {t.listing.available}: <Num value={listing.available_weight_grams} format="grams" />
            </p>
          </Card>

          {step === 'quantity' ? (
            <Card padding="normal" className="gap-5">
              <h2 className="text-h4 font-semibold text-fg m-0">{c.quantityTitle}</h2>
              <MoneyInput
                label={t.detail.gramsLabel}
                unit={t.units.grams}
                value={grams}
                onChangeValue={setGrams}
                suggestions={[
                  ...GRAM_CHIPS.filter((g) => g < listing.available_weight_grams),
                  listing.available_weight_grams,
                ]}
                suggestionLabel={(g) =>
                  g === listing.available_weight_grams ? t.detail.allQuantity : `${fmtNumber(g)} ${t.units.grams}`
                }
                error={qtyError}
              />
              {previewError && (
                <p
                  role="alert"
                  className="m-0 p-3 rounded-sm bg-danger-bg border border-danger-line text-sm font-medium text-danger-fg"
                >
                  {isolateFigures(previewError)}
                </p>
              )}
            </Card>
          ) : (
            <Card padding="normal" className="gap-4">
              <h2 className="text-h4 font-semibold text-fg m-0">{c.aiTitle}</h2>
              {/* risk_insight comes with the quote; when null the server's note says why */}
              <AiInsight
                text={preview?.risk_insight?.insight}
                isUnavailable={!preview?.risk_insight}
                unavailableText={preview?.risk_insight_note}
                source={preview?.risk_insight?.engine === 'llm' ? c.aiSourceLlm : c.aiSource}
              />
            </Card>
          )}
        </div>

        {/* Aside: order panel (sticky) */}
        <aside className="lg:sticky lg:top-24 flex flex-col gap-3">
          {step === 'quantity' ? (
            <Card padding="normal" className="gap-5">
              <h2 className="text-h4 font-semibold text-fg m-0">{c.estimateTitle}</h2>
              <p className="m-0 text-body text-fg-muted">
                {t.detail.livePrice(listing.karat)}: <Num value={Math.round(livePrice)} format="iqd" />
              </p>
              <OrderEstimate grams={qtyError ? 0 : grams} pricePerGram={livePrice} />
              <div className="hidden lg:block">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={Boolean(qtyError)}
                  loading={previewing}
                  onClick={() => requestPreview()}
                >
                  {c.review}
                </Button>
              </div>
            </Card>
          ) : (
            preview && (
              <>
                {kycInterrupted && !user.kyc_verified && (
                  <div
                    role="status"
                    className="p-3 rounded-sm bg-info-bg border border-info-line text-sm font-medium text-info-fg flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      <InfoIcon size={16} weight="fill" aria-hidden="true" />
                      {c.kycPending}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        openKyc({
                          role: 'investor',
                          pendingAction: { type: 'purchase', payload: order, returnTo: location.pathname },
                          onVerified: confirm,
                        })
                      }
                    >
                      {c.verifyNow}
                    </Button>
                  </div>
                )}

                {issue?.kind === 'insufficient' && (
                  <div
                    role="alert"
                    className="p-3 rounded-sm bg-danger-bg border border-danger-line text-sm font-medium text-danger-fg flex flex-col gap-2"
                  >
                    <span>
                      {c.quantityChanged} {isolateFigures(issue.message)}
                    </span>
                    <Button variant="secondary" size="sm" className="self-start" onClick={() => setStep('quantity')}>
                      {c.editQuantity}
                    </Button>
                  </div>
                )}

                {issue?.kind === 'network' && (
                  <div
                    role="alert"
                    className="p-3 rounded-sm bg-warning-bg border border-warning-line text-sm font-medium text-warning-fg flex flex-col gap-2"
                  >
                    <span>{c.networkUnknown}</span>
                    {/* Same key: returns the original transaction if it already went through */}
                    <Button variant="secondary" size="sm" className="self-start" loading={confirming} onClick={confirm}>
                      {c.retrySafely}
                    </Button>
                  </div>
                )}

                {issue?.kind === 'priceChanged' && (
                  <p
                    role="status"
                    className="m-0 p-3 rounded-sm bg-info-bg border border-info-line text-sm font-medium text-info-fg"
                  >
                    {c.priceChanged}
                  </p>
                )}

                {issue?.kind === 'generic' && (
                  <p
                    role="alert"
                    className="m-0 p-3 rounded-sm bg-danger-bg border border-danger-line text-sm font-medium text-danger-fg"
                  >
                    {isolateFigures(issue.message)}
                  </p>
                )}

                <div>
                  <OrderSummary
                    preview={preview}
                    onConfirm={confirm}
                    onRefresh={() => requestPreview()}
                    isStale={isStale}
                    loading={confirming}
                    refreshing={previewing}
                    actionsClassName="hidden lg:block"
                  />
                </div>

                {confirming && (
                  <p role="status" className="m-0 text-sm text-fg-muted text-center">
                    {c.executing}
                  </p>
                )}
              </>
            )
          )}
        </aside>
      </div>

      {/* Mobile: sticky bottom bar with the total and the one primary action (04-layout T3) */}
      <div className="lg:hidden fixed inset-x-0 bottom-16 z-header bg-surface-1 border-t border-line px-5 py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm text-fg-subtle">
            {t.order.total}
            {step === 'quantity' && ` (${t.estimate.estimated})`}
          </p>
          <p className="m-0 text-h4 font-semibold text-fg">
            <Num
              value={
                step === 'review' && preview
                  ? preview.total_paid_by_investor
                  : qtyError || !tiers
                    ? 0
                    : estimateOrder(grams, livePrice, tiers).total
              }
              format="iqd"
              standalone
            />
          </p>
        </div>
        {step === 'quantity' ? (
          <Button
            variant="primary"
            size="lg"
            disabled={Boolean(qtyError)}
            loading={previewing}
            onClick={() => requestPreview()}
          >
            {c.review}
          </Button>
        ) : isStale ? (
          <Button variant="primary" size="lg" loading={previewing} onClick={() => requestPreview()}>
            {t.order.refreshPreview}
          </Button>
        ) : (
          <Button variant="accent" size="lg" loading={confirming} onClick={confirm}>
            {t.order.confirm}
          </Button>
        )}
      </div>

      {/* Back/navigation intercepted while the purchase is executing */}
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        size="sm"
        title={c.leaveTitle}
        dismissible
      >
        <div className="flex flex-col gap-5">
          <p className="m-0 text-body text-fg-muted">{c.leaveBody}</p>
          <Button variant="primary" size="lg" onClick={() => blocker.reset?.()}>
            {c.stay}
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
