// src/features/auth/ChangePasswordForm.tsx
// Change password (D42): in Settings, and as a full screen right after signing in with a
// temporary password from an admin (the app waits until a new one is chosen). The server
// returns fresh tokens, so this session continues while every older one ends.

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toastStore';
import { errorMessage } from '@/lib/api';
import { t as messages, useT } from '@/i18n';
import { AuthShell } from './AuthShell';
import { useChangePassword } from './session';

const p = messages.password;
const schema = z
  .object({
    current: z.string().min(1, p.required),
    next: z.string().min(8, p.tooShort).max(72),
    confirm: z.string().min(1, p.required),
  })
  .refine((v) => v.next === v.confirm, { message: p.mismatch, path: ['confirm'] });
type Values = z.infer<typeof schema>;

export const ChangePasswordForm: React.FC<{ temporary?: boolean }> = ({ temporary = false }) => {
  const t = useT();
  const s = t.password;
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = (v: Values) =>
    change.mutate(
      { current: v.current, next: v.next },
      {
        onSuccess: () => {
          toast.success(s.done);
          reset();
        },
      }
    );

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4 max-w-g5">
      <Input
        label={temporary ? s.temporary : s.current}
        type="password"
        dir="ltr"
        autoComplete="current-password"
        error={errors.current?.message}
        {...register('current')}
      />
      <Input
        label={s.next}
        type="password"
        dir="ltr"
        autoComplete="new-password"
        error={errors.next?.message}
        {...register('next')}
      />
      <Input
        label={s.confirm}
        type="password"
        dir="ltr"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...register('confirm')}
      />
      {change.isError && (
        <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
          {errorMessage(change.error, s.failed)}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" className="self-start" loading={change.isPending}>
        {s.submit}
      </Button>
    </form>
  );
};

export const ForcedPasswordChange: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const t = useT();
  const s = t.password;
  return (
    <AuthShell>
      <div className="flex flex-col gap-5">
        <h1 className="text-h3 md:text-h2 font-semibold text-fg m-0">{s.forcedTitle}</h1>
        <p className="m-0 text-body text-fg-muted">{s.forcedIntro}</p>
        <ChangePasswordForm temporary />
        <button
          type="button"
          onClick={onLogout}
          className="self-start text-sm font-medium text-fg-link hover:text-fg-link-hover"
        >
          {s.logout}
        </button>
      </div>
    </AuthShell>
  );
};
