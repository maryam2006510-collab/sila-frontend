// src/features/landing/motion/reveals.ts
// The landing's one reveal language (D31, 07-motion §4.6), declared in markup, run once per element:
//   data-reveal        heading: rises through a bottom-up wipe, as one element (never split)
//   data-reveal-block  a paragraph or block: y 32 → 0 + fade
//   data-reveal-item   siblings that enter together: y 20 → 0 + fade, 55ms apart
// The motion itself is CSS (base.css, reduced motion keeps the final state). This hook only marks
// elements as they enter, with IntersectionObserver: DOM writes only, never a style or layout read,
// so setting up ~30 reveals costs nothing at load (GSAP tweens read computed styles one by one and
// forced a page-wide recalculation each time, D35). GSAP stays for pins and scrubbed timelines.

import { RefObject, useEffect } from 'react';
import { stagger } from '@/motion/tokens';

const SELECTOR = '[data-reveal], [data-reveal-block], [data-reveal-item]';

export const useLandingReveals = (scope: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        // Items that arrive in the same batch enter one after another
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          if (el.hasAttribute('data-reveal-item'))
            el.style.setProperty('--reveal-delay', `${order++ * stagger.card}ms`);
          el.setAttribute('data-revealed', '');
          io.unobserve(el);
        }
      },
      // Same start as the pinned timelines: 85% down the viewport
      { rootMargin: '0px 0px -15% 0px' }
    );
    const watch = (scopeEl: ParentNode) =>
      scopeEl.querySelectorAll(SELECTOR).forEach((el) => el.hasAttribute('data-revealed') || io.observe(el));
    watch(root);
    // Sections that mount later (a variant swapped on resize) join in
    const mo = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches(SELECTOR)) io.observe(n);
          watch(n);
        });
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [scope]);
};
