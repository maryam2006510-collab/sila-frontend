// src/features/auth/LoginPage.tsx
// Login per UI Kit 08-ux-user-flows.md §4 Screen 1.3 (workflow 01, step 3)

import React, { useEffect, useState } from 'react';
import { prefetchAppShell } from '@/app/router';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeSlashIcon, WarningOctagonIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { hasErrorCode, isApiError } from '@/lib/api';
import { useSessionStore } from '@/lib/session';
import { usePendingActionStore } from '@/lib/pendingAction';
import { useNow } from '@/lib/hooks';
import { fmtRelativeFuture } from '@/lib/formatters';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, SHOW_DEMO_ACCOUNTS } from '@/lib/demoAccounts';
import { t as messages, useT } from '@/i18n';
import { AuthShell } from './AuthShell';
import { useLogin, loginErrorMessage } from './session';

// Used only when the server sends no Retry-After header
const RATE_LIMIT_FALLBACK_SECONDS = 60;

const schema = z.object({
  email: z.string().trim().min(1, messages.auth.validation.emailRequired).email(messages.auth.validation.emailInvalid),
  password: z.string().min(1, messages.auth.validation.passwordRequired),
});
type LoginForm = z.infer<typeof schema>;

// Where to land after login: the page that sent us here, then a preserved intent, then home
const useReturnTo = () => {
  const location = useLocation();
  const pending = usePendingActionStore((s) => s.pendingAction);
  const from = (location.state as { from?: string } | null)?.from;
  return from ?? pending?.returnTo ?? '/app';
};

export const LoginPage: React.FC = () => {
  const t = useT();
  // The dashboard shell downloads while the form is being filled in (D35)
  useEffect(prefetchAppShell, []);
  const navigate = useNavigate();
  const returnTo = useReturnTo();
  const hasSession = useSessionStore((s) => s.hasSession);
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  // Rate limit (08-ux §3.2): the button stays disabled with a countdown until this time
  const [lockedUntil, setLockedUntil] = useState(0);
  const now = useNow(1000);
  const lockedFor = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema), mode: 'onBlur' });

  if (hasSession && !login.isPending) return <Navigate to={returnTo} replace />;

  const submit = (credentials: LoginForm) =>
    login.mutate(
      { email: credentials.email.trim(), password: credentials.password },
      {
        onSuccess: () => navigate(returnTo, { replace: true }),
        onError: (err) => {
          // Contract §2: wait Retry-After seconds
          if (hasErrorCode(err, 'RATE_LIMITED'))
            setLockedUntil(Date.now() + ((isApiError(err) && err.retryAfter) || RATE_LIMIT_FALLBACK_SECONDS) * 1000);
        },
      }
    );

  const errorText = login.isError
    ? lockedFor > 0
      ? t.auth.rateLimited(fmtRelativeFuture(lockedFor))
      : loginErrorMessage(login.error)
    : '';

  return (
    <AuthShell>
      <div className="flex flex-col gap-8">
        <h1 className="text-h3 md:text-h2 font-semibold text-fg m-0">{t.auth.loginTitle}</h1>

        {errorText && (
          <p
            role="alert"
            className="m-0 p-3 rounded-sm bg-danger-bg border border-danger-line text-sm font-medium text-danger-fg flex items-center gap-2"
          >
            <WarningOctagonIcon size={16} weight="fill" className="shrink-0" aria-hidden="true" />
            {errorText}
          </p>
        )}

        <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-5">
          <Input
            label={t.auth.email}
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="name@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label={t.auth.password}
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            autoComplete="current-password"
            error={errors.password?.message}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t.common.hidePassword : t.common.showPassword}
                className="size-11 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
              >
                {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            }
            {...register('password')}
          />

          <Button type="submit" variant="accent" size="lg" loading={login.isPending} disabled={lockedFor > 0} fullWidth>
            {t.auth.login}
          </Button>
        </form>

        {/* Contract §7 demo accounts: mock mode and dev builds only */}
        {SHOW_DEMO_ACCOUNTS && (
          <div className="pt-5 border-t border-line-subtle flex flex-col gap-3">
            <p className="m-0 text-sm text-fg-subtle">{t.auth.demoAccounts}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { user: DEMO_ACCOUNTS.investor, label: t.auth.demoVerifiedInvestor },
                { user: DEMO_ACCOUNTS.newInvestor, label: t.auth.demoNewInvestor },
                { user: DEMO_ACCOUNTS.seller, label: t.auth.demoSeller },
              ].map(({ user, label }) => (
                <Button
                  key={user.email}
                  variant="secondary"
                  size="md"
                  disabled={login.isPending}
                  onClick={() => submit({ email: user.email, password: DEMO_PASSWORD })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <p className="m-0 text-body text-fg-subtle">
          {t.auth.noAccount}{' '}
          <Link to="/signup" className="font-medium text-fg-link hover:text-fg-link-hover">
            {t.auth.createAccount}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};
