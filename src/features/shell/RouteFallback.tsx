// src/features/shell/RouteFallback.tsx
// Shown while a lazy route chunk loads on first navigation

import React from 'react';
import { PageLoader } from '@/components/ui/PageLoader';

export const RouteFallback: React.FC = () => <PageLoader />;
