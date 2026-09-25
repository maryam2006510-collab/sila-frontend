// src/features/landing/BrandMark.tsx
// Brand statement per UI Kit 08-ux §12 #7, 05-logo §5.3 & 06-style §3.3 ("four around one"):
// the icon's pieces assemble toward the centre as the section scrolls (GSAP scrub owns the
// pieces here). Reduced motion: the assembled icon, static.

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
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;

        // Each piece starts pushed outward along its own direction from the centre. All pieces are
        // measured first, then animated: measuring between writes would force a layout per piece.
        const pieces = gsap.utils.toArray<SVGPathElement>('[data-piece]');
        const offsets = pieces.map((piece) => {
          const r = piece.getBoundingClientRect();
          return { dx: (r.left + r.width / 2 - cx) * 0.6, dy: (r.top + r.height / 2 - cy) * 0.6 };
        });
        pieces.forEach((piece, i) => {
          const { dx, dy } = offsets[i];
          gsap.fromTo(
            piece,
            { x: dx, y: dy, opacity: 0 },
            {
              x: 0,
              y: 0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: { trigger: scope.current, start: 'top 80%', end: 'center 55%', scrub: T.scrub },
            }
          );
        });
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
        <div className="brand-mark size-g3 lg:size-g4 justify-self-center" dangerouslySetInnerHTML={ICON_MARKUP} />
        <p data-brand-line className="m-0 text-h2 sm:text-h1 lg:text-display-lg font-bold text-fg">
          {noOrphan(t.landing.brand.line)}
        </p>
      </div>
    </section>
  );
};
