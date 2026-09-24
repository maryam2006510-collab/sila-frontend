// Warms the Vite dev server before any test runs: the first visit compiles the whole module
// graph (and lets Vite pre-bundle its dependencies). Without this, parallel workers all hit
// a cold server at once and the first assertion of each can time out on a loaded machine.
import { chromium, FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL as string;
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  // The app shell and a lazy route, then the landing (its own chunk, with GSAP)
  await page.goto(`${baseURL}/login`);
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).waitFor({ timeout: 120_000 });
  await page.goto(`${baseURL}/`);
  await page.locator('h1').waitFor({ timeout: 120_000 });
  await browser.close();
}
