// Failure states: a request that fails is shown as a failure, never as 0 or as an empty list.
// Uses the mock switch `sila-mock-fail` (README); TanStack retries first, hence the longer waits.
import { test, expect } from '@playwright/test';
import { button, LISTING_22K } from './helpers';

const RETRIES_DONE = { timeout: 20_000 };

test.describe('failure states', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.removeItem('sila-mock-fail'));
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('sila-mock-fail'));
  });

  test('investor dashboard: failed history is not "0 purchases" and not a new-user checklist', async ({ page }) => {
    await button(page, 'مستثمر موثّق').click();
    await expect(page).toHaveURL(/\/app$/);
    await page.evaluate(() => localStorage.setItem('sila-mock-fail', '/transactions'));
    await page.goto('/app');

    await expect(page.getByText('تعذّر التحميل').first()).toBeVisible(RETRIES_DONE);
    await expect(page.getByText('تعذّر تحميل السجل.')).toBeVisible();
    await expect(page.getByText('ابدأ من هنا')).toHaveCount(0);
  });

  test('seller dashboard: failed listings is not the "add your first listing" empty state', async ({ page }) => {
    await button(page, 'بائع').click();
    await expect(page).toHaveURL(/\/app$/);
    await page.evaluate(() => localStorage.setItem('sila-mock-fail', '/listings'));
    await page.goto('/app');

    await expect(page.getByText('تعذّر تحميل عروضك.')).toBeVisible(RETRIES_DONE);
    await expect(page.getByText('لا توجد عروض بعد.')).toHaveCount(0);
  });

  test('checkout: a server error is retryable, not "listing not found"', async ({ page }) => {
    await button(page, 'مستثمر موثّق').click();
    await expect(page).toHaveURL(/\/app$/);
    await page.evaluate((id) => localStorage.setItem('sila-mock-fail', `/listings/${id}`), LISTING_22K);
    await page.goto(`/app/checkout/${LISTING_22K}`);

    await expect(page.getByText('تعذّر تحميل العرض.')).toBeVisible(RETRIES_DONE);
    await expect(page.getByText('هذا العرض غير موجود.')).toHaveCount(0);
    await page.evaluate(() => localStorage.removeItem('sila-mock-fail'));
    await button(page, 'إعادة المحاولة').click();
    await expect(page.getByText('كم غراماً تريد أن تشتري؟')).toBeVisible();
  });
});
