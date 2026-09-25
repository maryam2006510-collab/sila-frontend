// src/components/fin/SignatureCard.tsx
// Ownership signature card per UI Kit 06-style §6.5 & 08-ux §11 Screen 8.1
// On INTEGRITY_CHECK_FAILED the card shows no number at all.

import React, { useState } from 'react';
import {
  SignatureIcon,
  SealCheckIcon,
  CopyIcon,
  CheckIcon,
  ShieldWarningIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react';
import { Card, CardHeight } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';

interface SignatureCardProps {
  token?: string;
  verified?: boolean;
  isIntegrityFailed?: boolean;
  onContactSupport?: () => void;
  // The ownership record is still loading (no token yet)
  pending?: boolean;
  height?: CardHeight;
  stackedHeight?: 'fixed' | 'auto';
  className?: string;
}

const COPY_FEEDBACK_MS = 1600;

// a3f9…c21e
const shortHash = (token: string) => (token.length > 12 ? `${token.slice(0, 4)}…${token.slice(-4)}` : token);

export const SignatureCard: React.FC<SignatureCardProps> = ({
  token = '',
  verified = false,
  isIntegrityFailed = false,
  onContactSupport,
  pending = false,
  height = 'small',
  stackedHeight = 'fixed',
  className = '',
}) => {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard blocked: the hash stays visible for manual copy
    }
  };

  if (isIntegrityFailed) {
    return (
      <Card
        height={height}
        stackedHeight={stackedHeight}
        padding="normal"
        role="alert"
        className={`justify-between bg-danger-bg border-danger-line ${className}`}
      >
        <div className="flex items-center gap-2 text-danger-fg">
          <ShieldWarningIcon size={24} weight="fill" aria-hidden="true" />
          <h4 className="text-h4 font-semibold m-0">{t.signature.failedTitle}</h4>
        </div>
        <p className="text-body text-fg-muted m-0">{t.signature.failedBody}</p>
        {onContactSupport && (
          <Button variant="danger" size="md" onClick={onContactSupport} className="self-start">
            {t.signature.contactSupport}
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card height={height} stackedHeight={stackedHeight} padding="normal" className={`justify-between ${className}`}>
      {/* Wraps in narrow columns: the badge drops under the title instead of squeezing it */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="size-12 shrink-0 inline-flex items-center justify-center rounded-md bg-muted border border-line-subtle text-fg-muted">
            <SignatureIcon size={24} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h4 className="text-h4 font-semibold text-fg m-0">{t.signature.title}</h4>
            <p className="text-sm text-fg-subtle m-0">{t.signature.subtitle}</p>
          </div>
        </div>

        {verified && (
          <span className="inline-flex items-center gap-1 h-6 px-2 shrink-0 rounded-xs text-sm font-medium bg-success-bg border border-success-line text-success-fg">
            <SealCheckIcon size={16} weight="fill" aria-hidden="true" />
            {t.signature.verified}
          </span>
        )}
      </div>

      {/* No token yet (still loading or failed): no empty field with a copy button that copies nothing */}
      {token ? (
        <div className="flex items-center justify-between gap-2 h-control-md ps-3 rounded-sm bg-sunken border border-line-subtle">
          <code className="text-sm text-fg-muted num truncate" dir="ltr" title={token}>
            {shortHash(token)}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? t.common.copied : t.signature.copyHash}
            className="size-11 shrink-0 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
          >
            {copied ? <CheckIcon size={16} className="text-success-fg" /> : <CopyIcon size={16} />}
          </button>
        </div>
      ) : pending ? (
        <div className="h-control-md rounded-sm skeleton-loading" aria-hidden="true" />
      ) : (
        <p className="m-0 flex items-center gap-2 h-control-md text-body font-medium text-danger-fg">
          <WarningOctagonIcon size={20} weight="fill" className="shrink-0" aria-hidden="true" />
          {t.kpi.unavailable}
        </p>
      )}

      <p className="text-sm text-fg-subtle m-0 line-clamp-2">{t.signature.explain}</p>
    </Card>
  );
};
