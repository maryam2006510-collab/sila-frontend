// src/features/auth/ForgotPasswordPage.tsx
// "Forgot password" (D42): no e-mail is sent. The request reaches the admins, who issue a
// temporary password. The reply is the same whether the e-mail is registered or not.

import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircleIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, errorMessage, serverText } from '@/lib/api';
import { useT, Messages } from '@/i18n';
import { AuthShell } from './AuthShell';

// Built on every render from the current language's messages
const schemaFor = (v: Messages['auth']['validation']) => z.object({ email: z.string().trim().email(v.emailInvalid) });
type Values = z.infer<ReturnType<typeof schemaFor>>;

export const ForgotPasswordPage: React.FC = () => {
  const t = useT();
  const s = t.password;
  const send = useMutation({ mutationFn: (email: string) => api.forgotPassword(email) });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schemaFor(t.auth.validation)) });

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <h1 className="text-h3 md:text-h2 font-semibold text-fg m-0">{s.forgotTitle}</h1>

        {send.isSuccess ? (
          <p
            role="status"
            className="m-0 p-4 rounded-sm bg-success-bg border border-success-line text-body text-fg flex items-start gap-3"
          >
            <CheckCircleIcon size={20} weight="fill" className="shrink-0 mt-1 text-success-fg" aria-hidden="true" />
            {serverText(send.data, s.forgotDone)}
          </p>
        ) : (
          <form onSubmit={handleSubmit((v) => send.mutate(v.email))} noValidate className="flex flex-col gap-5">
            <p className="m-0 text-body text-fg-muted">{s.forgotIntro}</p>
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
                {errorMessage(send.error, s.forgotFailed)}
              </p>
            )}
            <Button type="submit" variant="primary" size="lg" loading={send.isPending} fullWidth>
              {s.forgotSubmit}
            </Button>
          </form>
        )}

        <Link to="/login" className="self-center text-body font-medium text-fg-link hover:text-fg-link-hover">
          {s.backToLogin}
        </Link>
      </div>
    </AuthShell>
  );
};
