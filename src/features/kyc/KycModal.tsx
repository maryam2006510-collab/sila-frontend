// src/features/kyc/KycModal.tsx
// Mock "توقيعك" verification sheet per UI Kit 08-ux-user-flows.md §5 (workflow 02)
// Mounted once in AppLayout; opened through `openKyc()`.

import React, { useCallback, useEffect, useState } from 'react';
import {
  IdentificationCardIcon,
  ShieldCheckIcon,
  HourglassIcon,
  SealCheckIcon,
  WarningOctagonIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Stepper, StepItem } from '@/components/ui/Stepper';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';
import { StateIcon } from '@/components/ui/StateIcon';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queries';
import { usePendingActionStore } from '@/lib/pendingAction';
import { useT } from '@/i18n';
import { useKycStore, KycRequest } from './kycStore';

// Keeps the verifying step readable without faking a long delay (08-ux §5 Sheet 2.2)
const MIN_VERIFYING_MS = 890;
// The verified state is shown this long before the interrupted request resumes by itself
const AUTO_CONTINUE_MS = 1200;

type Step = 'consent' | 'verifying' | 'verified' | 'failed';

// Each request mounts a fresh sheet (keyed), so every verification starts at consent
export const KycModal: React.FC = () => {
  const { request, requestId, close } = useKycStore();
  if (!request) return null;
  return <KycSheet key={requestId} request={request} close={close} />;
};

const KycSheet: React.FC<{ request: KycRequest; close: () => void }> = ({ request, close }) => {
  const t = useT();
  const k = t.kyc;
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('consent');
  const [stepperIndex, setStepperIndex] = useState(0);
  const [sealOn, setSealOn] = useState(false);

  const kycSteps: StepItem[] = [
    { id: 'send', label: k.stepSend },
    { id: 'match', label: k.stepMatch },
    { id: 'approve', label: k.stepApprove },
  ];

  // Seal swaps regular → fill once the verified step is on screen (07-motion #17)
  useEffect(() => {
    if (step !== 'verified') return;
    const id = requestAnimationFrame(() => setSealOn(true));
    return () => cancelAnimationFrame(id);
  }, [step]);

  const finish = useCallback(() => {
    const onVerified = request.onVerified;
    usePendingActionStore.getState().clearPendingAction();
    close();
    onVerified?.();
  }, [request, close]);

  // Contract §5/§6: after a successful KYC the original request is resent automatically.
  // The verified state stays on screen for a beat so the user sees what happened.
  useEffect(() => {
    if (step !== 'verified') return;
    const id = setTimeout(finish, AUTO_CONTINUE_MS);
    return () => clearTimeout(id);
  }, [step, finish]);

  const verify = async () => {
    setStep('verifying');
    setStepperIndex(1);
    try {
      await Promise.all([api.verifyKyc(request.role), new Promise((r) => setTimeout(r, MIN_VERIFYING_MS))]);
      setStepperIndex(kycSteps.length);
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      setStep('verified');
    } catch {
      setStep('failed');
    }
  };

  const reasons = [
    { icon: IdentificationCardIcon, text: k.reasonOnce },
    { icon: ShieldCheckIcon, text: k.reasonRights },
    { icon: HourglassIcon, text: k.reasonQuick },
  ];

  return (
    <Dialog isOpen onClose={close} size="md" showCloseButton={false} dismissible={step !== 'verifying'}>
      {/* Brand band: Sila is the one verifying; the government platform is named in text only.
          The band is the dialog's header, so the close button lives inside it */}
      <div className="-mx-5 md:-mx-8 -mt-5 md:-mt-8 p-5 md:p-8 bg-surface-brand text-fg-on-brand mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Logo variant="icon" tone="white" height={24} />
            <h3 className="text-h4 font-semibold m-0">{k.title}</h3>
          </div>
          {step !== 'verifying' && (
            <button
              type="button"
              onClick={close}
              aria-label={t.common.close}
              className="size-11 -me-3 shrink-0 inline-flex items-center justify-center rounded-sm text-fg-on-brand/80 hover:text-fg-on-brand hover:bg-white/10 outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 transition-colors dur-2 ease-standard"
            >
              <XIcon size={20} />
            </button>
          )}
        </div>
        <Badge variant="info" className="mt-3">
          {k.mockLabel}
        </Badge>
      </div>

      {step === 'consent' && (
        <div className="flex flex-col gap-5">
          <ul className="m-0 p-0 list-none flex flex-col gap-3">
            {reasons.map(({ icon: IconComponent, text }) => (
              <li key={text} className="flex items-center gap-3 text-body text-fg">
                <IconComponent size={24} className="text-fg-muted shrink-0" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-line-subtle">
            <Button variant="ghost" onClick={close}>
              {t.common.later}
            </Button>
            <Button variant="primary" onClick={verify}>
              {k.continue}
            </Button>
          </div>
        </div>
      )}

      {step === 'verifying' && (
        <div className="flex flex-col gap-5 py-5" aria-busy="true">
          <Stepper steps={kycSteps} currentStepIndex={stepperIndex} />
          <p role="status" className="m-0 text-body text-fg-muted">
            {k.verifying}
          </p>
        </div>
      )}

      {step === 'verified' && (
        <div className="flex flex-col items-center text-center gap-5 py-5">
          <span className="text-success-fg">
            <StateIcon icon={SealCheckIcon} active={sealOn} size={32} />
          </span>
          <div>
            <h4 className="text-h3 font-semibold text-fg m-0">{k.verifiedTitle}</h4>
            <p className="m-0 text-body text-fg-muted" role="status">
              {request.role === 'investor' ? k.resumingPurchase : k.resumingPublish}
            </p>
          </div>
          <Button variant="primary" size="lg" fullWidth autoFocus onClick={finish}>
            {request.role === 'investor' ? k.continuePurchase : k.continuePublish}
          </Button>
        </div>
      )}

      {step === 'failed' && (
        <div className="flex flex-col items-center text-center gap-5 py-5">
          <WarningOctagonIcon size={32} weight="fill" className="text-danger-fg" aria-hidden="true" />
          <div>
            <h4 className="text-h3 font-semibold text-fg m-0">{k.failedTitle}</h4>
            <p className="m-0 text-body text-fg-muted">{k.failedBody}</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={close}>
              {t.common.later}
            </Button>
            <Button variant="primary" onClick={verify}>
              {t.common.retry}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
};
