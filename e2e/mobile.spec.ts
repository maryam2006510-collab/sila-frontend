// Mobile (390 × 844): tab bar + "المزيد", sticky checkout bar (04-layout T3), logout reachable
import { test, expect } from '@playwright/test';
import { see, button, trackErrors, LISTING_21K, LISTING_22K } from './helpers';

test('mobile: checkout uses the sticky bottom bar; logout lives under "المزيد"', async ({ page }) => {
  const errors = trackErrors(page);

  await page.goto('/login');
  await button(page, 'مستثمر موثّق').click();
  await expect(page).toHaveURL(/\/app$/);

  // Tab bar short labels, and Premium reachable through "المزيد"
  const tabBar = page.getByRole('navigation').last();
  await expect(tabBar.getByText('الرئيسية')).toBeVisible();
  await button(page, 'المزيد').click();
  await see(page, 'رؤى Premium');
  await expect(button(page, 'تسجيل الخروج')).toBeVisible();
  await page.keyboard.press('Escape');

  // Checkout: total + primary action pinned at the bottom
  await page.goto(`/app/checkout/${LISTING_21K}`);
  await see(page, 'كم غراماً تريد أن تشتري؟');
  const review = button(page, 'مراجعة الطلب');
  await expect(review).toBeVisible();
  const box = await review.boundingBox();
  expect(box!.y).toBeGreaterThan(700);

  // No horizontal page scroll (04-layout checklist)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  expect(errors).toEqual([]);
});

test('mobile: topbar titles fit beside the price chip at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/login');
  await button(page, 'مستثمر موثّق').click();
  await expect(page).toHaveURL(/\/app$/);

  for (const path of ['/app', '/app/match', `/app/checkout/${LISTING_22K}`, '/app/insights']) {
    await page.goto(path);
    const title = page.locator('header h1');
    await expect(title).toBeVisible();
    expect(await title.evaluate((h) => h.scrollWidth > h.clientWidth), path).toBe(false);
  }
});

// A figure is never clipped: a truncated "4,071,604" once rendered as "1,604"
test('mobile: KPI figures fit their cards on narrow phones', async ({ page }) => {
  await page.goto('/login');
  await button(page, 'مستثمر موثّق').click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator('[data-kpi-value]').first()).toBeVisible();

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(100);

    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-kpi-value]')]
        .filter((el) => el.scrollWidth > el.clientWidth)
        .map((el) => el.innerText)
    );
    expect(clipped, `width ${width}`).toEqual([]);
  }
});
