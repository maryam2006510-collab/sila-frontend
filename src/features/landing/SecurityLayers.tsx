// src/features/landing/SecurityLayers.tsx
// Security layers per UI Kit 08-ux §12 #6 & 07-motion §4.5: the ONLY horizontal section.
// ≥ 768 with motion: pinned, scrubbed pan (RTL pans the other way). Otherwise a native
// scroll-snap carousel with a visible peek, swipe only, no autoplay.

import React, { useRef } from 'react';
import {
  CalculatorIcon,
  IdentificationCardIcon,
  ShieldCheckIcon,
  SignatureIcon,
  ClockCounterClockwiseIcon,
  SealCheckIcon,
  CheckIcon,
  XIcon,
  LockSimpleIcon,
  Icon,
} from '@phosphor-icons/react';
import { Stepper } from '@/components/ui/Stepper';
import { Num } from '@/components/ui/Num';
import { KARATS } from '@/lib/pricing';
import { useDirection } from '@/lib/direction';
import { noOrphan } from '@/lib/noOrphan';
import { useT } from '@/i18n';
import { gsap, useGSAP, MQ, T } from './motion/gsap';

const ICONS: Icon[] = [
  CalculatorIcon,
  IdentificationCardIcon,
  ShieldCheckIcon,
  SignatureIcon,
  ClockCounterClockwiseIcon,
];

// Mini visuals: small, flat, built from the same tokens as the app
const PricingVisual: React.FC = () => {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-body text-fg">{t.newListing.formula}</p>
      <div className="flex items-end gap-3 h-21" aria-hidden="true">
        {KARATS.map((k) => (
          <div key={k} className="flex-1 flex flex-col items-center gap-1 h-full">
            {/* The bar gets its own area: sharing the column with the label let flex shrink
                every bar to the same height, hiding the karat/24 ratio */}
            <div className="flex-1 w-full flex items-end">
              <span className="w-full rounded-2xs bg-tone-signal" style={{ height: `${(k / 24) * 100}%` }} />
            </div>
            <span className="shrink-0 text-xs text-fg-subtle">{k}K</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const IdentityVisual: React.FC = () => {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <Stepper
        steps={[
          { id: 's', label: t.kyc.stepSend },
          { id: 'm', label: t.kyc.stepMatch },
          { id: 'a', label: t.kyc.stepApprove },
        ]}
        currentStepIndex={3}
      />
      <p className="m-0 flex items-center gap-2 text-body font-medium text-success-fg">
        <SealCheckIcon size={20} weight="fill" aria-hidden="true" />
        {t.kyc.verifiedTitle}
      </p>
    </div>
  );
};

const AtomicVisual: React.FC = () => {
  const t = useT();
  const s = t.landing.security;
  return (
    <div className="grid grid-cols-2 gap-3">
      <p className="m-0 p-3 rounded-sm bg-success-bg border border-success-line text-body font-medium text-success-fg flex items-center gap-2">
        <CheckIcon size={20} aria-hidden="true" />
        {s.atomicAll}
      </p>
      <p className="m-0 p-3 rounded-sm bg-muted border border-line-subtle text-body font-medium text-fg-muted flex items-center gap-2">
        <XIcon size={20} aria-hidden="true" />
        {s.atomicNone}
      </p>
    </div>
  );
};

const SignatureVisual: React.FC = () => {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3 h-control-md ps-3 pe-2 rounded-sm bg-sunken border border-line-subtle">
      <code className="num text-sm text-fg-muted" dir="ltr">
        a3f9…c21e
      </code>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-success-fg">
        <SealCheckIcon size={16} weight="fill" aria-hidden="true" />
        {t.signature.verified}
      </span>
    </div>
  );
};

const RecordVisual: React.FC = () => (
  <ul className="m-0 p-0 list-none flex flex-col divide-y divide-line-subtle">
    {[1_249_084, 2_883_593, 511_476].map((v) => (
      <li key={v} className="flex items-center justify-between gap-3 h-11">
        <LockSimpleIcon size={16} className="text-fg-subtle" aria-hidden="true" />
        <Num value={v} format="iqd" className="text-body text-fg" />
      </li>
    ))}
  </ul>
);

const VISUALS = [PricingVisual, IdentityVisual, AtomicVisual, SignatureVisual, RecordVisual];

export const SecurityLayers: React.FC = () => {
  const t = useT();
  const s = t.landing.security;
  const isRtl = useDirection() === 'rtl';
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const total = s.panels.length;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.tablet, () => {
        const track = trackRef.current!;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        // One linear timeline: the track pans and the progress rail fills from the reading edge
        const pan = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: wrapRef.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: T.scrub,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        pan
          .to(track, { x: () => (isRtl ? distance() : -distance()) })
          .fromTo(
            '[data-pan-fill]',
            { scaleX: 0 },
            { scaleX: 1, transformOrigin: isRtl ? 'right center' : 'left center' },
            0
          );
        // Small parallax on each icon tile as its card crosses the screen (07-motion §4.5, max 24px)
        gsap.utils.toArray<HTMLElement>('[data-panel-tile]').forEach((tile) => {
          gsap.fromTo(
            tile,
            { x: isRtl ? -24 : 24 },
            {
              x: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: tile,
                containerAnimation: pan,
                // RTL pans rightward, so cards enter from the left edge
                start: isRtl ? 'right left' : 'left right',
                end: isRtl ? 'right center' : 'left center',
                scrub: true,
              },
            }
          );
        });
      });
      return () => mm.revert();
    },
    { scope: wrapRef, dependencies: [isRtl] }
  );

  return (
    <section id="security" aria-label={s.title} className="landing-anchor overflow-x-clip">
      <div ref={wrapRef} className="md:motion-safe:h-svh flex flex-col justify-center gap-8 md:gap-13 py-21">
        <div className="container-landing w-full px-5 md:px-8 xl:px-13 flex items-end justify-between gap-8">
          <h2 data-reveal className="m-0 text-h2 sm:text-h1 lg:text-display-lg font-bold text-fg">
            {noOrphan(s.title)}
          </h2>
          {/* Pan progress: only where the section pans (tablet and up, motion allowed) */}
          <span className="hidden md:motion-safe:flex items-center gap-3 shrink-0 pb-3" aria-hidden="true">
            <bdi className="num text-sm font-semibold text-fg-subtle">01</bdi>
            <span className="relative h-1 w-32 sila-cut bg-line overflow-hidden">
              <span data-pan-fill className="absolute inset-0 bg-state-indicator" />
            </span>
            <bdi className="num text-sm font-semibold text-fg-subtle">0{total}</bdi>
          </span>
        </div>

        <div className="overflow-x-auto md:motion-safe:overflow-visible snap-x snap-mandatory scroll-px-5 no-scrollbar">
          <ol ref={trackRef} className="m-0 list-none flex gap-4 md:gap-5 w-max track-inset">
            {s.panels.map((panel, i) => {
              const PanelIcon = ICONS[i];
              const Visual = VISUALS[i];
              return (
                <li
                  key={panel.title}
                  className="snap-start shrink-0 w-carousel md:w-100 md:h-115 rounded-md bg-surface-1 border border-line p-5 md:p-6 flex flex-col gap-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Icon tile with the Sila Cut on its inline-end top corner (03-icon §8, 06-style §3.1) */}
                    <span
                      data-panel-tile
                      className="size-13 inline-flex items-center justify-center rounded-sm bg-muted border border-line-subtle text-fg sila-cut"
                    >
                      <PanelIcon size={24} aria-hidden="true" />
                    </span>
                    <bdi className="num text-sm font-semibold text-fg-subtle" aria-hidden="true">
                      0{i + 1} / 0{total}
                    </bdi>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <h3 className="m-0 text-h4 font-semibold text-fg">{noOrphan(panel.title)}</h3>
                    <p className="m-0 text-body text-fg-muted">{panel.body}</p>
                  </div>
                  {/* Every visual sits in the same well, so the five cards line up edge to edge */}
                  <div className="h-44 shrink-0 rounded-sm bg-subtle border border-line-subtle p-4 flex flex-col justify-center">
                    <Visual />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
