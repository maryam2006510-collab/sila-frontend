// src/features/landing/LandingPage.tsx
// Landing per UI Kit 08-ux §12 (structure), 07-motion §4 (GSAP choreography) and 00-master §5.
// Follows the shared theme (device preference, then the visitor's toggle): D17 departs from
// the kit's dark-only landing. GSAP ships in this route's chunk only.

import React from 'react';
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

export const LandingPage: React.FC = () => (
  <div className="relative min-h-screen bg-canvas text-fg overflow-x-clip">
    <LandingNav />
    <main>
      <Hero />
      <MarketStrip />
      <Walkthrough />
      <PricingCalculator />
      <SecurityLayers />
      <BrandMark />
      <ForSellers />
      <PremiumBento />
      <Faq />
    </main>
    <FinalCta />
  </div>
);
