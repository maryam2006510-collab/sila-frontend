// src/components/ui/Skeleton.tsx
// Skeleton per UI Kit 04-layout §8.3 & 07-motion §3 (#13): opacity pulse, no shimmer gradient.
// Sizes are passed as utility classes so skeletons reserve the exact final slot.

import React from 'react';

interface SkeletonProps {
  // e.g. "h-g4 w-full" or "h-6 w-g3"
  className?: string;
  radius?: 'xs' | 'sm' | 'md' | 'lg';
}

const radiusClasses = { xs: 'rounded-xs', sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg' } as const;

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', radius = 'sm' }) => (
  <div className={`skeleton-loading ${radiusClasses[radius]} ${className}`} aria-hidden="true" />
);
