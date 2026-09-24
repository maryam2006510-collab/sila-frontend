// src/app/providers.tsx
// Global Context & Config Providers

import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig, LazyMotion } from 'motion/react';
import { IconContext } from '@phosphor-icons/react';
import { useThemeStore } from './theme';
import { useLocaleStore } from '@/lib/direction';
import { queryClient } from '@/lib/queryClient';

const loadMotionFeatures = () => import('@/motion/features').then((mod) => mod.default);

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const theme = useThemeStore((s) => s.theme);
  const { locale, direction } = useLocaleStore();

  useEffect(() => {
    // Synchronize HTML attributes on mount
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [theme, locale, direction]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* strict: any stray `motion.*` (full bundle) throws in development */}
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">
          <IconContext.Provider value={{ size: 20, weight: 'regular', mirrored: false }}>
            {children}
          </IconContext.Provider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
