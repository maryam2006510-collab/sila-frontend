// src/features/auth/SignupPage.tsx
// Sign up form per UI Kit 08-ux-user-flows.md §4 Screen 1.2 (workflow 01, step 2)
// Client rules mirror the server's Pydantic schema; the server still decides.

import React, { useEffect, useState } from 'react';
import { prefetchAppShell } from '@/app/router';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckSquareIcon, SquareIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toastStore';
import { api, errorMessage, hasErrorCode, isApiError } from '@/lib/api';
import { useMirrored } from '@/lib/direction';
import { noOrphan } from '@/lib/noOrphan';
import { useSessionStore } from '@/lib/session';
import { RiskProfile, UserRole } from '@/lib/types';
import { t as messages, useT } from '@/i18n';
import { AuthShell } from './AuthShell';
import { useLogin } from './session';

// Contract §4: password 8 to 72 characters
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72;
const v = messages.auth.validation;

const schemaFor = (role: UserRole) =>
  z
    .object({
      full_name: z.string().trim().min(1, v.nameRequired),
      email: z.string().trim().min(1, v.emailRequired).email(v.emailInvalid),
      password: z.string().min(MIN_PASSWORD, v.passwordShort).max(MAX_PASSWORD, v.passwordLong),
      risk_profile: z.enum(['low', 'medium', 'high']).optional(),
    })
    .refine((d) => role !== 'investor' || Boolean(d.risk_profile), {
      path: ['risk_profile'],
      message: v.riskRequired,
    });

type SignupForm = z.infer<ReturnType<typeof schemaFor>>;

const RISK_OPTIONS: RiskProfile[] = ['low', 'medium', 'high'];

export const SignupPage: React.FC = () => {
  const t = useT();
  // The dashboard shell downloads while the form is being filled in (D35)
  useEffect(prefetchAppShell, []);
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const mirrored = useMirrored();
  const hasSession = useSessionStore((s) => s.hasSession);
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const userRole: UserRole | null = role === 'investor' || role === 'seller' ? role : null;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(schemaFor(userRole ?? 'investor')),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const password = useWatch({ control, name: 'password' }) ?? '';

  if (!userRole) return <Navigate to="/signup" replace />;
  if (hasSession && !isSubmitting) return <Navigate to="/app" replace />;

  const passwordLongEnough = password.length >= MIN_PASSWORD;

  const onSubmit = async (data: SignupForm) => {
    setFormError('');
    const credentials = { email: data.email.trim(), password: data.password };
    try {
      await api.signup({
        role: userRole,
        full_name: data.full_name.trim(),
        ...credentials,
        ...(userRole === 'investor' ? { risk_profile: data.risk_profile } : {}),
      });
    } catch (err) {
      if (hasErrorCode(err, 'EMAIL_ALREADY_EXISTS')) {
        setError('email', { message: errorMessage(err, t.auth.emailTaken) }, { shouldFocus: true });
      } else if (isApiError(err) && err.details.length > 0) {
        // 422 VALIDATION_ERROR: each server message goes under its own field
        err.details.forEach((d, i) => {
          if (d.field === 'full_name' || d.field === 'email' || d.field === 'password' || d.field === 'risk_profile')
            setError(d.field, { message: d.message }, { shouldFocus: i === 0 });
        });
      } else if (hasErrorCode(err, 'NETWORK_ERROR')) {
        setFormError(t.auth.networkError);
      } else {
        setFormError(isApiError(err) && err.message ? err.message : t.auth.unexpectedError);
      }
      return;
    }

    // The account exists now; sign in with the same credentials
    try {
      await login.mutateAsync(credentials);
      toast.success(t.auth.welcome(data.full_name.trim()));
      navigate('/app', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <AuthShell>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            to="/signup"
            className="self-start inline-flex items-center gap-2 text-sm font-medium text-fg-link hover:text-fg-link-hover"
          >
            <ArrowLeftIcon size={16} mirrored={mirrored} aria-hidden="true" />
            {t.auth.changeRole}
          </Link>
          <h1 className="text-h3 md:text-h2 font-semibold text-fg m-0">
            {userRole === 'investor' ? t.auth.signupInvestorTitle : t.auth.signupSellerTitle}
          </h1>
        </div>

        {formError && (
          <p
            role="alert"
            className="m-0 p-3 rounded-sm bg-danger-bg border border-danger-line text-sm font-medium text-danger-fg"
          >
            {formError}
          </p>
        )}

        <div className="flex flex-col gap-5">
          <Input
            label={t.auth.fullName}
            autoComplete="name"
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          <Input
            label={t.auth.email}
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="name@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="flex flex-col gap-2">
            <Input
              label={t.auth.password}
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              autoComplete="new-password"
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
            {!errors.password && (
              <p
                className={`m-0 flex items-center gap-2 text-sm ${passwordLongEnough ? 'text-success-fg' : 'text-fg-subtle'}`}
              >
                {passwordLongEnough ? (
                  <CheckSquareIcon size={16} weight="fill" aria-hidden="true" />
                ) : (
                  <SquareIcon size={16} aria-hidden="true" />
                )}
                {t.auth.passwordHint}
              </p>
            )}
          </div>

          {userRole === 'investor' && (
            <Controller
              control={control}
              name="risk_profile"
              render={({ field, fieldState }) => (
                <fieldset className="m-0 p-0 border-0 flex flex-col gap-2">
                  <legend className="text-sm font-medium text-fg-muted mb-2">{t.auth.riskProfile}</legend>
                  <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {RISK_OPTIONS.map((option) => {
                      const selected = field.value === option;
                      return (
                        <button
                          key={option}
                          ref={option === 'low' ? field.ref : undefined}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => field.onChange(option)}
                          onBlur={field.onBlur}
                          className={`sm:h-g2 p-4 rounded-md bg-surface-1 border text-start flex flex-col gap-1 outline-none transition-control dur-3 ease-standard focus-visible:ring-3 focus-visible:ring-line-focus/35 ${
                            selected
                              ? 'border-transparent selected-ring bg-state-selected'
                              : 'border-line hover:border-line-strong'
                          }`}
                        >
                          <span className="text-body font-semibold text-fg">{t.auth.risk[option].title}</span>
                          <span className="text-sm text-fg-muted text-pretty">
                            {noOrphan(t.auth.risk[option].body)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {fieldState.error ? (
                    <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
                      {fieldState.error.message}
                    </p>
                  ) : (
                    <p className="m-0 text-sm text-fg-subtle">{t.auth.riskHelper}</p>
                  )}
                </fieldset>
              )}
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" variant="accent" size="lg" loading={isSubmitting} fullWidth>
            {t.auth.createAccount}
          </Button>
          <p className="m-0 text-sm text-fg-subtle">{t.auth.legal}</p>
          <p className="m-0 text-body text-fg-subtle">
            {t.auth.haveAccountShort}{' '}
            <Link to="/login" className="font-medium text-fg-link hover:text-fg-link-hover">
              {t.auth.login}
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
};
