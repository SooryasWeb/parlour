import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

let app;
let db;

test.beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SOORYAS_TEST = '1';
  process.env.PGDATABASE = 'sooryas_parlour_test';
  db = await import('../../src/db.js');
  const serverModule = await import('../../src/server.js');
  app = await serverModule.createApp();
  await app.listen(3110);
});

test.beforeEach(async ({ page }) => {
  execFileSync('node', ['scripts/reset-test-db.js'], {
    cwd: new URL('../..', import.meta.url),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      SOORYAS_TEST: '1',
      PGDATABASE: 'sooryas_parlour_test',
    },
    stdio: 'inherit',
  });
  await page.goto('/');
  await page.getByLabel('Username').fill('soorya');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test.afterAll(async () => {
  await app?.close();
  await db?.closePool();
});

test('US-AUTH-02 shows the operational menu after login', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Dashboard/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Bookings/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Customers CRM/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Invoices & Billing/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Staff & Commission/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Inventory/ })).toBeVisible();
});

test('US-CRM-01 validates and saves a customer with WhatsApp consent', async ({ page }) => {
  await page.getByRole('button', { name: /Customers CRM/ }).click();

  await page.locator('#customer-name').fill('UI Test Customer');
  await page.locator('#customer-country-code').fill('+91');
  await page.locator('#customer-phone').fill('12345');
  await page.getByRole('button', { name: 'Save Customer' }).click();
  expect(await page.locator('#customer-phone').evaluate((input) => input.validity.valid)).toBe(false);

  await page.locator('#customer-phone').fill('9847011111');
  await page.locator('#customer-email').fill('ui.customer@example.com');
  await page.locator('#customer-whatsapp-consent').check();
  await page.getByRole('button', { name: 'Save Customer' }).click();

  await expect(page.locator('#toast')).toContainText('Customer record saved.');
  const customerRow = page.locator('#customers-list .list-item').filter({ hasText: 'UI Test Customer' });
  await expect(customerRow.getByText('UI Test Customer', { exact: true })).toBeVisible();
  await expect(customerRow.getByText('WhatsApp OK')).toBeVisible();
});

test('US-SVC-02 validates staff phone and commission before save', async ({ page }) => {
  await page.getByRole('button', { name: /Staff & Commission/ }).click();

  await page.locator('#staff-name').fill('UI Test Staff');
  await page.locator('#staff-country-code').fill('+91');
  await page.locator('#staff-phone').fill('9847012222');
  await page.getByLabel('Job Role').selectOption('beautician');
  await page.getByLabel('Commission Model').selectOption('percentage');
  await page.locator('#staff-commission-val').fill('34');
  await page.getByRole('button', { name: 'Onboard Staff' }).click();
  expect(await page.locator('#staff-commission-val').evaluate((input) => input.validity.valid)).toBe(false);

  await page.locator('#staff-commission-val').fill('33');
  await page.getByRole('button', { name: 'Onboard Staff' }).click();

  await expect(page.locator('#toast')).toContainText('Staff onboarded successfully.');
  await expect(page.locator('#staff-list').getByText('UI Test Staff', { exact: true })).toBeVisible();
});

test('US-BILL-01 generates a bill from a selected customer and service', async ({ page }) => {
  await page.getByRole('button', { name: /Invoices & Billing/ }).click();
  await page.locator('#invoice-customer-id').selectOption('customer-meera');
  await page.locator('#invoice-item-service').selectOption('service-facial');
  await page.locator('#invoice-discount').fill('0');

  await page.getByRole('button', { name: 'Generate Bill' }).click();

  await expect(page.locator('#toast')).toContainText('Invoice successfully generated.');
  await expect(page.getByText(/Invoice INV-/)).toBeVisible();
});
