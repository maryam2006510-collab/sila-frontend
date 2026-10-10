// English interface (D45): the toggle switches language and direction, forms validate in
// English, the choice survives a reload, and Settings switches back to Arabic.
import { test, expect } from '@playwright/test';
import { button, nav, see, trackErrors } from './helpers';

test('english: switch from the landing page, sign in, and back to Arabic from Settings', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await see(page, 'Start investing in gold');

  // The choice is remembered
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await button(page, 'Sign in').click();
  await see(page, 'Enter your email.');

  await button(page, 'Verified investor').click();
  await expect(page).toHaveURL(/\/app$/);
  await see(page, 'Gold owned');
  await expect(page.getByRole('link', { name: 'My portfolio' })).toBeVisible();

  await nav(page, '/app/settings');
  await page.getByRole('radio', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await see(page, 'الإعدادات');
  expect(errors).toEqual([]);
});
