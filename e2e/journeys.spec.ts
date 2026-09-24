// End-to-end user journeys, workflows 01 → 08 (mock backend, Arabic RTL, desktop).
// One page for the whole file: steps build on each other like a real session.
import { test, expect, Page } from '@playwright/test';
import { nav, see, button, trackErrors, LISTING_21K, LISTING_22K } from './helpers';

test.describe.configure({ mode: 'serial' });

let page: Page;
let errors: string[];

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  errors = trackErrors(page);
});

test.afterAll(async () => {
  expect(errors, 'runtime errors').toEqual([]);
  await page.close();
});

// ---- 01 Onboarding · session ---------------------------------------------
test('guard: /app without a session redirects to /login', async () => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login$/);
});

test('login: wrong password shows one generic message', async () => {
  await page.getByLabel('البريد الإلكتروني').fill('ali@sila.iq');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('wrongpass1');
  await button(page, 'تسجيل الدخول').click();
  await see(page, /البريد الإلكتروني أو كلمة المرور غير صحيحة/);
});

test('login: demo account lands on the investor dashboard', async () => {
  await button(page, 'مستثمر جديد').click();
  await expect(page).toHaveURL(/\/app$/);
  await see(page, 'ابدأ المطابقة');
});

test('session: a full reload restores the session through the refresh token', async () => {
  await page.goto(`/app/checkout/${LISTING_22K}`);
  await see(page, 'كم غراماً تريد أن تشتري؟');
});

// ---- 05 Checkout + 02 KYC ------------------------------------------------
test('checkout: confirm hits 403 KYC_NOT_VERIFIED and opens the KYC sheet', async () => {
  await button(page, 'مراجعة الطلب').click();
  await see(page, 'ملخص الطلب');
  await button(page, /أكّد الشراء/).click();
  await see(page, 'وثّق هويتك لإتمام العملية');
});

test('kyc: verify, then the SAME purchase resumes by itself (contract §5)', async () => {
  await button(page, 'متابعة التوثيق').click();
  await see(page, 'تم توثيق هويتك');
  // No click: the original confirm is resent automatically with the same Idempotency-Key
  await see(page, 'تمت عملية الشراء بنجاح');
  // The account block reflects the new status without a reload
  await expect(page.getByText('غير موثّق')).toHaveCount(0);
});

test('checkout: the receipt shows the balance returned by confirm', async () => {
  await see(page, 'رصيدك الآن');
  await see(page, '10.00');
});

// ---- 08 Portfolio ---------------------------------------------------------
test('portfolio: verified balance, signature seal and a receipt from history', async () => {
  await nav(page, '/app/portfolio');
  await see(page, 'رصيدك الموثّق');
  await see(page, 'تم التحقق');
  await page.getByRole('row', { name: /عيار 22/ }).click();
  await see(page, 'إيصال العملية');
  await see(page, /[0-9a-f]{8}…[0-9a-f]{4}/);
  await page.keyboard.press('Escape');
});

test('integrity: a tampered balance hides every balance figure', async () => {
  await page.evaluate(() => localStorage.setItem('sila-mock-integrity-fail', '1'));
  await page.goto('/app/portfolio');
  await see(page, 'تعذّر التحقق من رصيدك');
  await expect(page.getByText('رصيدك الموثّق')).toHaveCount(0);
  await page.evaluate(() => localStorage.removeItem('sila-mock-integrity-fail'));
});

// ---- 07 Premium ------------------------------------------------------------
test('premium: locked insights → subscribe (mock payment) → insights open', async () => {
  await nav(page, '/app/insights');
  await see(page, 'هذه الرؤى متاحة لمشتركي Premium.');
  await button(page, 'اشترك الآن').click();
  await expect(page).toHaveURL(/\/app\/premium$/);
  await button(page, 'اشترك الآن').click();
  await see(page, /من اليوم حتى/);
  await button(page, /تأكيد الاشتراك/).click();
  await expect(page).toHaveURL(/\/app\/insights$/);
  await see(page, 'أعلى سعر خلال 7 أيام');
});

test('settings: account details and the ownership disclaimer', async () => {
  await nav(page, '/app/settings');
  await see(page, 'حول صِلة');
  await see(page, 'علي الجبوري');
});

// ---- 03 Market · 04 Smart Match -----------------------------------------
test('market: the karat filter in the URL is applied server-side', async () => {
  await nav(page, '/app/market?karat=21');
  await see(page, '1 عروض متاحة');
  await see(page, 'ذهب عيار 21');
  await expect(page.getByText('صاغة شارع النهر')).toHaveCount(0);
});

test('match: a budget returns ranked results with AI reasons', async () => {
  await nav(page, '/app/match');
  await see(page, 'كم تريد أن تستثمر؟');
  await button(page, 'ابدأ المطابقة').click();
  await see(page, /وجدنا/);
  await see(page, 'الأنسب لك');
});

test('match: a budget below the cheapest listing shows the minimum', async () => {
  await button(page, 'تعديل الميزانية').click();
  await page.getByLabel('الميزانية بالدينار العراقي').fill('5000');
  await button(page, 'ابدأ المطابقة').click();
  await see(page, /ماكو عروض تناسب/);
});

test('rbac: an investor cannot open seller routes', async () => {
  await nav(page, '/app/listings/new');
  await expect(page).toHaveURL(/\/app$/);
});

test('logout clears the session', async () => {
  await button(page, 'تسجيل الخروج').click();
  await expect(page).toHaveURL(/\/login$/);
});

// ---- 01 Signup · 06 Seller ------------------------------------------------
test('signup: a duplicate email shows 409 under the field', async () => {
  await nav(page, '/signup/seller');
  await see(page, 'افتح حساب بائع');
  await page.getByLabel('الاسم الكامل').fill('صاغة الأعظمية');
  await page.getByLabel('البريد الإلكتروني').fill('karrada@sila.iq');
  await page.getByLabel('كلمة المرور', { exact: true }).fill('goldpass99');
  await button(page, 'إنشاء الحساب').click();
  await see(page, /مسجل مسبقاً/);
});

test('signup: a new seller account is created and signed in', async () => {
  await page.getByLabel('البريد الإلكتروني').fill('adhamiya@sila.iq');
  await button(page, 'إنشاء الحساب').click();
  await expect(page).toHaveURL(/\/app$/);
  await see(page, 'أضف عرضك الأول');
});

test('seller: publishing without KYC → sheet → auto-publish after verifying', async () => {
  await nav(page, '/app/listings/new');
  await page.getByLabel('الوزن الكلي (غ)').fill('40');
  await button(page, 'نشر العرض').click();
  await see(page, 'وثّق هويتك لإتمام العملية');
  await button(page, 'متابعة التوثيق').click();
  await see(page, 'تم توثيق هويتك');
  // Resent automatically with the same Idempotency-Key (contract §6)
  await expect(page).toHaveURL(/\/app\/listings$/);
  await see(page, 'ذهب عيار 21');
});

test('seller: "my listings" shows only the seller own listings', async () => {
  // Only the new seller's single listing: header row + one row
  await expect(page.getByRole('row')).toHaveCount(2);
  await expect(page.getByText('صاغة شارع النهر')).toHaveCount(0);
});

test('seller: sales page and the own listing detail', async () => {
  await nav(page, '/app/sales');
  await see(page, 'عروضك');
  await page.getByRole('link', { name: /ذهب عيار 21/ }).click();
  await see(page, 'مبيعات هذا العرض');
});

test('rbac: a seller cannot open checkout', async () => {
  await nav(page, `/app/checkout/${LISTING_21K}`);
  await expect(page).toHaveURL(/\/app$/);
});
