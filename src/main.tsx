// src/main.tsx
// Application entry point

import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '@/styles/fonts';
import '@/styles/tailwind.css';
import { Providers } from '@/app/providers';
import { router } from '@/app/router';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </React.StrictMode>
);
