// Shared E2E helpers

// Seeded listings of the mock server (mirror of the backend seed, src/lib/mock/data.ts)
export const LISTING_21K = '00000000-0000-4000-8200-000000000001';
export const LISTING_22K = '00000000-0000-4000-8200-000000000004';
import { Page, expect } from '@playwright/test';

// In-app navigation (like clicking a link): keeps the in-memory mock server state,
// which a full page.goto() would reset.
export const nav = async (page: Page, path: string) => {
  await page.evaluate((p) => {
    history.pushState({}, '', p);
    dispatchEvent(new PopStateEvent('popstate'));
  }, path);
};

export const see = (page: Page, text: string | RegExp) => expect(page.getByText(text).first()).toBeVisible();

export const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' });

// Collects uncaught exceptions and console errors so every spec can assert "zero runtime errors"
export const trackErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
};
