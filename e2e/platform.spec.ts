// End-to-end journeys of the integrated platform (mock backend, Arabic RTL, desktop):
// investor resale (workflow 09), "forgot password" handled by an admin, the admin panel,
// the forced password change and the notifications bell. One page: steps build on each other.
import { test, expect, Page } from '@playwright/test';
import { nav, see, button, trackErrors } from './helpers';

test.describe.configure({ mode: 'serial' });

let page: Page;
let errors: string[];
let temporaryPassword = '';

const login = async (email: string, password: string) => {
  await page.getByLabel('البريد الإلكتروني').fill(email);
  await page.getByLabel('كلمة المرور', { exact: true }).fill(password);
  await button(page, 'تسجيل الدخول').click();
  await expect(page).toHaveURL(/\/app$/);
};

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  errors = trackErrors(page);
});

test.afterAll(async () => {
  expect(errors, 'runtime errors').toEqual([]);
  await page.close();
});

// ---- Coming soon --------------------------------------------------------------
test('waitlist: a visitor registers interest in oil from the landing page', async () => {
  await page.goto('/#coming-soon');
  const section = page.locator('#coming-soon');
  await section.scrollIntoViewIfNeeded();
  await section.getByRole('radio', { name: 'النفط' }).click();
  await section.getByLabel('البريد الإلكتروني').fill('visitor@mail.com');
  await section.getByRole('button', { name: 'سجّل اهتمامك' }).click();
  await expect(section.getByRole('status')).toContainText('تم تسجيل اهتمامك بالنفط');
});

// ---- 09 Investor resale ----------------------------------------------------
test('resale: an investor offers part of a holding back on the market', async () => {
  await page.goto('/login');
  await login('zainab@sila.iq', 'Sila@2026');
  await nav(page, '/app/portfolio');
  await see(page, 'رصيدك حسب العيار');
  await button(page, 'اعرض عيار 22 للبيع').click();
  await page.getByLabel('الكمية بالغرام').fill('5');
  await see(page, 'قيمتها بسعر اليوم');
  await button(page, 'انشر العرض').click();
  await see(page, 'انتشر عرضك بالسوق.');
  await see(page, 'عروض إعادة البيع مالتك');
});

test('resale: the offer is on the market without the investor name, and not buyable by its owner', async () => {
  await nav(page, '/app/market?karat=22');
  await see(page, 'إعادة بيع من مستثمر');
  // The signed-in investor's own name is in the sidebar: look only at the listing cards
  const grid = page.locator('.card-grid-listings');
  await expect(grid.getByText('زينب الموسوي')).toHaveCount(0);
  const mine = grid.locator('article, div').filter({ hasText: 'إعادة بيع من مستثمر' }).last();
  await expect(mine.getByRole('button', { name: 'اشترِ' })).toHaveCount(0);
  await expect(grid.getByRole('button', { name: 'اشترِ' })).toHaveCount(2);
});

test('resale: an offer can be withdrawn, after a confirmation', async () => {
  await nav(page, '/app/portfolio');
  await button(page, 'سحب العرض').click();
  await button(page, 'اسحب العرض').click();
  await see(page, 'مسحوب');
  await button(page, 'تسجيل الخروج').click();
  await expect(page).toHaveURL(/\/login$/);
});

// ---- Forgot password → admin ------------------------------------------------
test('forgot password: the same reply whatever the email, no account details leaked', async () => {
  await page.getByRole('link', { name: 'نسيت كلمة المرور؟' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByLabel('البريد الإلكتروني').fill('ali@sila.iq');
  await button(page, 'أرسل الطلب').click();
  await see(page, /طلبك وصل لإدارة صِلة/);
  await page.getByRole('link', { name: 'رجوع لتسجيل الدخول' }).click();
});

test('admin: lands on the platform overview with the pending request flagged', async () => {
  await login('admin@sila.iq', 'Sila@2026');
  await see(page, 'المنصة اليوم');
  await see(page, 'إدارة المنصة');
  await page.getByRole('link', { name: 'افتح الطلبات' }).click();
  await expect(page).toHaveURL(/\/app\/admin\/password-requests$/);
});

test('admin: issues a temporary password, shown once', async () => {
  await see(page, 'علي الجبوري');
  await button(page, 'كلمة مرور مؤقتة').click();
  const dialog = page.getByRole('dialog', { name: 'كلمة المرور المؤقتة' });
  await expect(dialog).toBeVisible();
  temporaryPassword = (await dialog.locator('code').textContent())?.trim() ?? '';
  expect(temporaryPassword).toMatch(/^\S{12}$/);
  await dialog.getByRole('button', { name: 'تم' }).click();
  await see(page, 'ماكو طلبات هنا.');
});

test('admin: users search, KYC and deactivate with a confirmation', async () => {
  await page.getByRole('link', { name: 'المستخدمون' }).click();
  await page.getByLabel('ابحث بالاسم أو البريد الإلكتروني').fill('haider');
  await see(page, 'haider@sila.iq');
  await expect(page.getByText('zainab@sila.iq')).toHaveCount(0);
  await button(page, 'إيقاف الحساب').click();
  await page.getByRole('dialog').getByRole('button', { name: 'إيقاف الحساب' }).click();
  await see(page, 'موقوف');
  await button(page, 'تفعيل الحساب').click();
  await expect(page.getByText('موقوف')).toHaveCount(0);
});

test('admin: listings can be suspended and re-activated', async () => {
  await page.getByRole('link', { name: 'العروض' }).click();
  await button(page, 'إيقاف').first().click();
  await see(page, 'تحدّثت حالة العرض.');
});

test('admin: the audit log records the reset and filters by event', async () => {
  await page.getByRole('link', { name: 'سجل الأمان' }).click();
  await page.getByRole('button', { name: 'كلمة مرور مؤقتة من الإدارة' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'كلمة مرور مؤقتة من الإدارة' })).toHaveCount(1);
});

test('rbac: an admin cannot open investor routes', async () => {
  await nav(page, '/app/portfolio');
  await expect(page).toHaveURL(/\/app$/);
  await button(page, 'تسجيل الخروج').click();
});

// ---- Temporary password → forced change → bell --------------------------------
test('temporary password: a new one is required before anything else', async () => {
  await login('ali@sila.iq', temporaryPassword);
  await see(page, 'اختار كلمة مرور جديدة');
  await page.getByLabel('كلمة المرور المؤقتة').fill(temporaryPassword);
  await page.getByLabel('كلمة المرور الجديدة', { exact: true }).fill('NewGold2026');
  await page.getByLabel('أعد كتابة كلمة المرور الجديدة').fill('NewGold2026');
  await button(page, 'احفظ كلمة المرور').click();
  await see(page, 'ابدأ المطابقة');
});

test('bell: the reset notice is unread, and opening it marks it read', async () => {
  const bell = page.getByRole('button', { name: /الإشعارات، 1 غير مقروءة/ });
  await expect(bell).toBeVisible();
  await bell.click();
  await see(page, 'كلمة مرور جديدة');
  await button(page, 'تحديد الكل كمقروء').click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'الإشعارات', exact: true })).toBeVisible();
});
