// Keyboard-only paths (08-ux §13: full keyboard path through checkout, visible focus, logical order)
import { test, expect, Page } from '@playwright/test';
import { button, trackErrors, LISTING_22K } from './helpers';

// Presses Tab until the focused element has this accessible name (fails after `max` stops)
const tabTo = async (page: Page, name: RegExp, max = 40) => {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || ''
    );
    if (name.test(label.trim())) return;
  }
  throw new Error(`Tab never reached ${name}`);
};

test('keyboard: skip link, then the whole checkout without a mouse', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/login');
  await button(page, 'مستثمر جديد').click();
  await expect(page).toHaveURL(/\/app$/);

  await page.goto(`/app/checkout/${LISTING_22K}`);
  await expect(page.getByText('كم غراماً تريد أن تشتري؟')).toBeVisible();

  // The first Tab stop skips the sidebar and topbar
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'انتقل إلى المحتوى' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();

  // Quantity chip → review → confirm opens KYC (new investor) → verify → confirm → receipt
  await tabTo(page, /^25 غ$/);
  await page.keyboard.press('Enter');
  await tabTo(page, /^مراجعة الطلب$/);
  await page.keyboard.press('Enter');
  await expect(page.getByText('ملخص الطلب').first()).toBeVisible();

  await tabTo(page, /^أكّد الشراء/);
  await page.keyboard.press('Enter');
  await expect(page.getByText('وثّق هويتك لإتمام العملية')).toBeVisible();

  await tabTo(page, /^متابعة التوثيق$/);
  await page.keyboard.press('Enter');
  await expect(page.getByText('تم توثيق هويتك')).toBeVisible();
  // The focused "إكمال الشراء" continues at once; otherwise it resumes by itself
  await page.keyboard.press('Enter');
  await expect(page.getByText('تمت عملية الشراء بنجاح')).toBeVisible();

  expect(errors).toEqual([]);
});
