// Landing page smoke: hero, single marquee, no horizontal overflow, zero runtime errors, CTA route
import { test, expect } from '@playwright/test';
import { see, trackErrors } from './helpers';

test.describe('landing', () => {
  test('follows the device theme, and the nav toggle switches it', async ({ browser }) => {
    for (const scheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({ colorScheme: scheme });
      const page = await context.newPage();
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      await page.getByRole('button', { name: scheme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme === 'dark' ? 'light' : 'dark');
      await context.close();
    }
  });

  test('renders the full page cleanly', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');

    await expect(page.locator('h1')).toBeVisible();
    // Only one marquee on the page (07-motion §4)
    await expect(page.locator('.marquee-track')).toHaveCount(1);

    // Scroll through every section so pinned timelines and lazy visuals run
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(40);
    }
    await see(page, 'كيف تعمل صِلة');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test('the nav stays on screen once scrolled, and never shows two gold CTAs', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header').first();
    const navCta = header.locator('a[href="/signup"]');
    await expect(header).toBeInViewport();
    // The hero holds the only gold CTA at the top
    await expect(navCta).toHaveCount(0);

    // Scrolling down keeps the bar (D29); the hero CTA is off screen, so the nav carries the gold one
    await page.mouse.wheel(0, 1400);
    await expect(header.getByRole('link', { name: 'الأسعار' })).toBeInViewport();
    await expect(navCta).toBeVisible();
  });

  test('a section link glides to its section and marks it as current', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'القائمة' }).getByRole('link', { name: 'الأسئلة' }).click();
    await expect(page.locator('#faq')).toBeInViewport();
    await expect(page.getByRole('link', { name: 'الأسئلة' }).first()).toHaveAttribute('aria-current', 'location');
  });

  test('the open-account CTA leads to signup', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-hero-cta] a[href="/signup"]').click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test('reduced motion still shows every section without pinning', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await page.locator('#faq').scrollIntoViewIfNeeded();
    await expect(page.locator('#faq h2')).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  });
});
