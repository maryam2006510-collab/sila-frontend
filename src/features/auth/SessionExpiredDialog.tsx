// src/features/auth/SessionExpiredDialog.tsx
// Login sheet over the current page when the refresh token is rejected (08-ux §3.2).
// The page underneath stays mounted, so inputs and the pending action are preserved.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useSessionStore } from '@/lib/session';
import { useMe } from '@/lib/queries';
import { useT } from '@/i18n';
import { useLogin, signOut, loginErrorMessage } from './session';

export const SessionExpiredDialog: React.FC = () => {
  const t = useT();
  const expired = useSessionStore((s) => s.expired);
  const { data: user } = useMe();
  const navigate = useNavigate();
  const login = useLogin();
  const [password, setPassword] = useState('');

  if (!expired || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email: user.email, password }, { onSuccess: () => setPassword('') });
  };

  const handleSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <Dialog
      isOpen
      onClose={handleSignOut}
      size="sm"
      title={t.session.expiredTitle}
      showCloseButton={false}
      dismissible={false}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <p className="text-body text-fg-muted m-0">{t.session.expiredBody}</p>

        <Input label={t.auth.email} type="email" dir="ltr" value={user.email} readOnly />
        <Input
          label={t.auth.password}
          type="password"
          dir="ltr"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={login.isError ? loginErrorMessage(login.error) : undefined}
          required
        />

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleSignOut}>
            {t.shell.logout}
          </Button>
          <Button type="submit" variant="primary" loading={login.isPending} disabled={!password}>
            {t.auth.login}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
