// src/features/premium/PriceAlertsCard.tsx
// Premium price alerts (D41): pick a karat, a direction and a target per gram; the server checks
// every price refresh and sends one notification to the bell when the target is crossed.

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRingingIcon, XIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Segmented } from '@/components/ui/Segmented';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { toast } from '@/components/ui/toastStore';
import { api, errorMessage } from '@/lib/api';
import { isolateFigures } from '@/lib/bidi';
import { livePriceFor } from '@/lib/pricing';
import { queryKeys, useAlerts } from '@/lib/queries';
import { fmtIQD } from '@/lib/formatters';
import type { AlertDirection, AlertStatus, Karat, MarketPrices } from '@/lib/types';
import { useT } from '@/i18n';

const KARATS: Karat[] = [24, 22, 21, 18];
const STATUS_BADGE: Record<AlertStatus, BadgeVariant> = {
  active: 'info',
  triggered: 'success',
  cancelled: 'neutral',
};

export const PriceAlertsCard: React.FC<{ prices: MarketPrices }> = ({ prices }) => {
  const t = useT();
  const s = t.priceAlerts;
  const queryClient = useQueryClient();
  const alerts = useAlerts(true);
  const [karat, setKarat] = useState<Karat>(21);
  const [direction, setDirection] = useState<AlertDirection>('above');
  const current = livePriceFor(prices, karat);
  // A sensible default target: 1% away from today's price, in whole dinars
  const [target, setTarget] = useState(() => Math.round(current * 1.01));

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
  const create = useMutation({
    mutationFn: () => api.createAlert(karat, direction, target),
    onSuccess: () => {
      toast.success(s.created);
      refresh();
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelAlert(id),
    onSuccess: refresh,
  });

  const changeDirection = (next: AlertDirection) => {
    setDirection(next);
    setTarget(Math.round(current * (next === 'above' ? 1.01 : 0.99)));
  };
  const changeKarat = (next: Karat) => {
    setKarat(next);
    setTarget(Math.round(livePriceFor(prices, next) * (direction === 'above' ? 1.01 : 0.99)));
  };

  return (
    <Card padding="spacious" className="gap-5">
      <div>
        <h2 className="text-h4 font-semibold text-fg m-0 flex items-center gap-2">
          <BellRingingIcon size={24} className="text-fg-muted" aria-hidden="true" />
          {s.title}
        </h2>
        <p className="m-0 text-body text-fg-muted">{s.intro}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm font-medium text-fg-muted">{s.karat}</p>
          <Segmented
            options={KARATS.map((k) => ({ value: k, label: t.units.karat(k) }))}
            value={karat}
            onChange={changeKarat}
            ariaLabel={s.karat}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm font-medium text-fg-muted">{s.direction}</p>
          <Segmented
            options={[
              { value: 'above' as const, label: s.above },
              { value: 'below' as const, label: s.below },
            ]}
            value={direction}
            onChange={changeDirection}
            ariaLabel={s.direction}
          />
        </div>
      </div>

      <MoneyInput
        label={s.target}
        value={target}
        onChangeValue={setTarget}
        helperText={s.current(`${fmtIQD(current)} ${t.units.iqd}`)}
      />

      {create.isError && (
        <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
          {isolateFigures(errorMessage(create.error, s.createFailed))}
        </p>
      )}

      <Button
        variant="primary"
        size="lg"
        className="self-start"
        loading={create.isPending}
        disabled={target <= 0}
        onClick={() => create.mutate()}
      >
        {s.create}
      </Button>

      <div className="border-t border-line-subtle pt-3">
        {alerts.data && alerts.data.length > 0 ? (
          <ul className="m-0 p-0 list-none divide-y divide-line-subtle">
            {alerts.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <p className="m-0 text-body font-medium text-fg">
                    {isolateFigures(
                      s.summary(
                        a.karat,
                        a.direction === 'above' ? s.above : s.below,
                        `${fmtIQD(a.target_price_per_gram)} ${t.units.iqd}`
                      )
                    )}
                  </p>
                  <Badge variant={STATUS_BADGE[a.status]} icon={false}>
                    {s.status[a.status]}
                  </Badge>
                </div>
                {a.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="md"
                    aria-label={s.cancelLabel}
                    loading={cancel.isPending && cancel.variables === a.id}
                    onClick={() => cancel.mutate(a.id)}
                  >
                    <XIcon size={16} aria-hidden="true" />
                    {s.cancel}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-body text-fg-subtle">{s.none}</p>
        )}
      </div>
    </Card>
  );
};
