// src/features/landing/Waitlist.tsx
// "Register your interest" (D44): the hero promises real estate and oil, and this is where a
// visitor asks to hear about them. Only the e-mail and the asset are kept (the admin sees the
// list); registering twice is harmless, and the reply comes from the server.

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircleIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { api, errorMessage, serverText } from '@/lib/api';
import { noOrphan } from '@/lib/noOrphan';
import type { InterestAssetClass } from '@/lib/types';
import { useT, Messages } from '@/i18n';

// Built on every render from the current language's messages
const schemaFor = (v: Messages['auth']['validation']) => z.object({ email: z.string().trim().email(v.emailInvalid) });
type Values = z.infer<ReturnType<typeof schemaFor>>;

export const Waitlist: React.FC = () => {
  const t = useT();
  const w = t.landing.waitlist;
  const [asset, setAsset] = useState<InterestAssetClass>('real_estate');
  const send = useMutation({
    mutationFn: (email: string) => api.registerInterest(email, asset),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schemaFor(t.auth.validation)) });

  return (
    <section
      id="coming-soon"
      aria-labelledby="waitlist-title"
      className="landing-anchor cv-auto container-landing px-5 md:px-8 xl:px-13 py-21 lg:py-34"
    >
      <div className="grid grid-cols-1 lg:grid-cols-golden gap-8 lg:gap-13 items-start">
        <div className="flex flex-col gap-5">
          <h2 id="waitlist-title" data-reveal className="m-0 text-h2 sm:text-h1 font-bold text-fg">
            {noOrphan(w.title)}
          </h2>
          <p data-reveal className="m-0 max-w-g5 text-h4 font-normal text-fg-muted">
            {w.body}
          </p>
        </div>

        <div data-reveal className="rounded-md bg-surface-1 border border-line p-5 md:p-8 flex flex-col gap-5">
          {send.isSuccess ? (
            <>
              <p role="status" className="m-0 text-body text-fg flex items-start gap-3">
                <CheckCircleIcon size={20} weight="fill" className="shrink-0 mt-1 text-success-fg" aria-hidden="true" />
                {serverText(send.data, w.done)}
              </p>
              <Button variant="secondary" size="md" className="self-start" onClick={() => send.reset()}>
                {w.again}
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit((v) => send.mutate(v.email))} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <p className="m-0 text-sm font-medium text-fg-muted">{w.assetLabel}</p>
                <Segmented
                  name="waitlist-asset"
                  ariaLabel={w.assetLabel}
                  options={[
                    { value: 'real_estate' as const, label: t.landing.hero.assets.realEstate },
                    { value: 'oil' as const, label: t.landing.hero.assets.oil },
                  ]}
                  value={asset}
                  onChange={setAsset}
                />
              </div>
              <Input
                label={t.auth.email}
                type="email"
                dir="ltr"
                autoComplete="email"
                placeholder="name@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
              {send.isError && (
                <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
                  {errorMessage(send.error, w.failed)}
                </p>
              )}
              <Button type="submit" variant="primary" size="lg" loading={send.isPending} fullWidth>
                {w.submit}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
