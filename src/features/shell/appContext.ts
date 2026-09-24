// src/features/shell/appContext.ts
// Data every /app page receives from AppLayout (guaranteed loaded before pages render)

import { useOutletContext } from 'react-router-dom';
import { User, MarketPrices } from '@/lib/types';

export interface AppOutletContext {
  user: User;
  prices: MarketPrices;
}

export const useAppContext = () => useOutletContext<AppOutletContext>();
