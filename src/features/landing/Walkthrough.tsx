// src/features/landing/Walkthrough.tsx
// "كيف تعمل" per UI Kit 08-ux §12 #4 & 07-motion §4.4.
// Desktop (≥ 1024, motion allowed): one pinned section; scroll scrubs through 5 steps with
// label snapping, a device frame crossfading real app screens, and a 5-segment Sila Cut rail.
// Mobile / reduced motion: no pin; stacked steps that reveal once in view (Motion).

import React, { useRef } from 'react';
import * as m from 'motion/react-m';
import { noOrphan } from '@/lib/noOrphan';
import { useT } from '@/i18n';
import { useDirection } from '@/lib/direction';
import { useMediaQuery } from '@/lib/hooks';
import { transition } from '@/motion/tokens';
import { gsap, useGSAP, MQ, T } from './motion/gsap';
import { PricesScreen, MatchScreen, ReviewScreen, VerifyScreen, OwnScreen } from './DemoScreens';

const SCREENS = [PricesScreen, MatchScreen, ReviewScreen, VerifyScreen, OwnScreen];

// Section reveal: y 32 → 0 + fade, dur-5, out-expo (07-motion §4.6)
const reveal = transition.reveal;
const LABELS = ['prices', 'match', 'preview', 'verify', 'own'];

// Illustrative frame: its buttons are not real controls, so it is inert for keyboard/AT
const DeviceFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    inert
    aria-hidden="true"
    className={`relative w-full max-w-110 rounded-lg border border-line-strong bg-canvas p-3 sm:p-5 shadow-lg ${className}`}
  >
    {children}
  </div>
);

export const Walkthrough: React.FC = () => {
  const t = useT();
  const w = t.landing.how;
  const isRtl = useDirection() === 'rtl';
  const pinRef = useRef<HTMLDivElement>(null);
  // Only the variant on screen is built: each carries five live demo screens
  const pinned = useMediaQuery(MQ.desktop);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.desktop, () => {
        const steps = gsap.utils.toArray<HTMLElement>('[data-step]');
        const screens = gsap.utils.toArray<HTMLElement>('[data-screen]');
        const fills = gsap.utils.toArray<HTMLElement>('[data-rail-fill]');

        gsap.set([...steps.slice(1), ...screens.slice(1)], { autoAlpha: 0, y: 20 });
        gsap.set(fills, { scaleX: 0, transformOrigin: isRtl ? 'right center' : 'left center' });
        gsap.set(fills[0], { scaleX: 1 });

        const tl = gsap.timeline({
          defaults: { ease: 'power2.inOut', duration: 1 },
          scrollTrigger: {
            trigger: pinRef.current,
            start: 'top top',
            end: () => `+=${window.innerHeight * (steps.length - 1)}`,
            pin: true,
            scrub: T.scrub,
            anticipatePin: 1,
            snap: { snapTo: 'labelsDirectional', duration: T.dur4, ease: 'power2.inOut' },
            invalidateOnRefresh: true,
          },
        });

        tl.addLabel(LABELS[0]);
        for (let i = 1; i < steps.length; i++) {
          tl.to(steps[i - 1], { autoAlpha: 0, y: -20 })
            .to(steps[i], { autoAlpha: 1, y: 0 }, '<')
            .to(screens[i - 1], { autoAlpha: 0, y: -20 }, '<')
            .to(screens[i], { autoAlpha: 1, y: 0 }, '<')
            .to(fills[i], { scaleX: 1 }, '<')
            .addLabel(LABELS[i]);
        }
      });
      return () => mm.revert();
    },
    { scope: pinRef, dependencies: [isRtl, pinned] }
  );

  return (
    <section id="how" aria-label={w.title} className="landing-anchor">
      {/* ---- Desktop: pinned, scroll-driven -------------------------------- */}
      {pinned ? (
        <div ref={pinRef} className="flex h-svh items-center">
          <div className="container-landing w-full px-8 xl:px-13 grid grid-cols-golden gap-13 items-center">
            <div className="flex flex-col gap-8">
              <h2 data-reveal className="m-0 text-display-lg font-bold text-fg">
                {noOrphan(w.title)}
              </h2>

              {/* Progress rail: 5 Sila Cut segments */}
              <div className="flex gap-1" role="img" aria-label={w.progress}>
                {w.steps.map((s) => (
                  <span key={s.title} className="relative h-1 flex-1 sila-cut bg-line overflow-hidden">
                    <span data-rail-fill className="absolute inset-0 bg-state-indicator" />
                  </span>
                ))}
              </div>

              <div className="relative min-h-g3">
                {w.steps.map((s) => (
                  <div key={s.title} data-step className="absolute inset-0 flex flex-col gap-3">
                    <h3 className="m-0 text-h2 font-semibold text-fg">{noOrphan(s.title)}</h3>
                    <p className="m-0 max-w-128 text-h4 font-normal text-fg-muted">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-g5 flex items-center justify-center">
              {SCREENS.map((Screen, i) => (
                <div key={LABELS[i]} data-screen className="absolute inset-0 flex items-center justify-center">
                  <DeviceFrame>
                    <Screen />
                  </DeviceFrame>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ---- Mobile / reduced motion: stacked, reveal once ----------------- */
        <div className="container-landing px-5 md:px-8 py-21 flex flex-col gap-13">
          <h2 data-reveal className="m-0 text-h2 sm:text-h1 font-bold text-fg">
            {noOrphan(w.title)}
          </h2>
          <ol className="m-0 p-0 list-none flex flex-col gap-21">
            {w.steps.map((s, i) => {
              const Screen = SCREENS[i];
              return (
                <m.li
                  key={s.title}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={reveal}
                  className="flex flex-col gap-5"
                >
                  <div className="flex flex-col gap-2">
                    <span className="h-1 w-13 sila-cut bg-state-indicator" aria-hidden="true" />
                    <h3 className="m-0 text-h3 font-semibold text-fg">{noOrphan(s.title)}</h3>
                    <p className="m-0 text-h4 font-normal text-fg-muted">{s.body}</p>
                  </div>
                  <DeviceFrame>
                    <Screen />
                  </DeviceFrame>
                </m.li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
};
