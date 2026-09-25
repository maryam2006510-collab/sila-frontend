// src/features/landing/LandingPage.tsx
// Landing per UI Kit 08-ux §12 (structure), 07-motion §4 (GSAP choreography) and 00-master §5.
// Follows the shared theme (device preference, then the visitor's toggle): D17 departs from
// the kit's dark-only landing. GSAP ships in this route's chunk only.

import React, { startTransition, useEffect, useRef, useState } from 'react';
import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { MarketStrip } from './MarketStrip';
import { Walkthrough } from './Walkthrough';
import { PricingCalculator } from './PricingCalculator';
import { SecurityLayers } from './SecurityLayers';
import { BrandMark } from './BrandMark';
import { ForSellers } from './ForSellers';
import { PremiumBento } from './PremiumBento';
import { Faq } from './Faq';
import { FinalCta } from './FinalCta';
import { useLandingReveals } from './motion/reveals';
import { ScrollTrigger } from './motion/gsap';

// The hero entrance ends around here (words, sub, CTAs, card: base.css .hero-in-*)
const HERO_ENTRANCE_MS = 1300;

export const LandingPage: React.FC = () => {
  const scope = useRef<HTMLDivElement>(null);
  useLandingReveals(scope);

  // The first paint carries only what is on screen: nav, hero, price strip. Everything below renders
  // as a transition React splits into small slices, so the hero never waits behind the whole page's
  // render and layout (D35).
  const [rest, setRest] = useState(false);
  // It waits for the hero entrance (~1.2s, 07-motion §4.3) so the two never compete for frames, or
  // for the visitor's first sign of intent to move on, whichever comes first.
  useEffect(() => {
    const intents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    const go = () => {
      clearTimeout(timer);
      intents.forEach((e) => window.removeEventListener(e, go));
      startTransition(() => setRest(true));
    };
    const timer = setTimeout(go, HERO_ENTRANCE_MS);
    intents.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    return () => {
      clearTimeout(timer);
      intents.forEach((e) => window.removeEventListener(e, go));
    };
  }, []);

  // Once the rest is in: pins measure the final page, and a #section link opened directly lands
  useEffect(() => {
    if (!rest) return;
    ScrollTrigger.refresh();
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ block: 'start' });
  }, [rest]);

  return (
    <div ref={scope} className="relative min-h-screen bg-canvas text-fg overflow-x-clip">
      <LandingNav ready={rest} />
      <main>
        <Hero />
        <MarketStrip />
        {/* Holds the page tall until the rest arrives, so an early scroll is never cut short */}
        {!rest && <div className="h-g7" aria-hidden="true" />}
        {rest && (
          <>
            <Walkthrough />
            <PricingCalculator />
            <SecurityLayers />
            <BrandMark />
            <ForSellers />
            <PremiumBento />
            <Faq />
          </>
        )}
      </main>
      {rest && <FinalCta />}
    </div>
  );
};
