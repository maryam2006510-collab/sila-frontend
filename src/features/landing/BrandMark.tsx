// src/features/landing/BrandMark.tsx
// Brand statement per UI Kit 08-ux §12 #7 and 05-logo §5: the mark assembles as the section
// scrolls (GSAP scrub owns its three paths here). The loop's two pieces slide in from opposite
// sides and meet, then the slash drops in along its own slant. One colour throughout: Navy on the
// light canvas, White on the dark one. Reduced motion: the assembled mark, static.

import React, { useRef } from 'react';
import iconSvg from '@/assets/brand/sila-icon.svg?raw';
import { noOrphan } from '@/lib/noOrphan';
import { useT } from '@/i18n';
import { gsap, useGSAP, T } from './motion/gsap';

// Trusted build-time asset; sized to its container
const ICON_MARKUP = {
  __html: iconSvg.replace('<svg ', '<svg width="100%" height="100%" aria-hidden="true" focusable="false" '),
};

export const BrandMark: React.FC = () => {
  const t = useT();
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const svg = scope.current!.querySelector('svg')!;
        const box = svg.getBoundingClientRect();
        const piece = (n: number) => svg.querySelector<SVGPathElement>(`[data-piece="${n}"]`)!;
        const loop = piece(1);
        const inner = piece(2);
        const slash = piece(3);
        // Measured before any write: reading layout between writes would force a reflow each time
        const s = slash.getBoundingClientRect();
        const reveal = { trigger: scope.current, scrub: T.scrub };
        const shift = box.width * 0.3;

        // The loop and its inner piece come from opposite sides (the mark is never mirrored, so
        // these are physical directions in both languages)
        gsap.fromTo(
          loop,
          { x: shift, opacity: 0 },
          { x: 0, opacity: 1, ease: 'none', scrollTrigger: { ...reveal, start: 'top 80%', end: 'center 60%' } }
        );
        gsap.fromTo(
          inner,
          { x: -shift, opacity: 0 },
          { x: 0, opacity: 1, ease: 'none', scrollTrigger: { ...reveal, start: 'top 80%', end: 'center 60%' } }
        );
        // The slash runs from upper right to lower left: it drops in along that same line
        gsap.fromTo(
          slash,
          { x: s.width * 1.5, y: -s.height * 1.5, opacity: 0 },
          { x: 0, y: 0, opacity: 1, ease: 'none', scrollTrigger: { ...reveal, start: 'top 65%', end: 'center 55%' } }
        );
        gsap.from('[data-brand-line]', {
          opacity: 0,
          y: 20,
          ease: 'none',
          scrollTrigger: { trigger: scope.current, start: 'center 75%', end: 'center 55%', scrub: T.scrub },
        });
      });
      return () => mm.revert();
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      aria-label={t.landing.brand.line}
      className="container-landing px-5 md:px-8 xl:px-13 py-21 lg:py-34"
    >
      <div className="grid grid-cols-1 md:grid-cols-golden-rev gap-13 items-center">
        <div
          className="size-g3 lg:size-g4 justify-self-center text-logo-on-canvas"
          dangerouslySetInnerHTML={ICON_MARKUP}
        />
        <p data-brand-line className="m-0 text-h2 sm:text-h1 lg:text-display-lg font-bold text-fg">
          {noOrphan(t.landing.brand.line)}
        </p>
      </div>
    </section>
  );
};
