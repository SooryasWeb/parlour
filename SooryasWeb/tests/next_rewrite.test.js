import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const nextRoot = new URL('../next-app/', import.meta.url);

async function readNextFile(path) {
  return readFile(new URL(path, nextRoot), 'utf8');
}

test('Next rewrite scaffold uses App Router, TypeScript, and Vercel build scripts', async () => {
  const pkg = JSON.parse(await readNextFile('package.json'));

  assert.equal(pkg.scripts.dev, 'next dev');
  assert.equal(pkg.scripts.build, 'next build');
  assert.equal(pkg.scripts.lint, 'tsc --noEmit');
  assert.equal(pkg.dependencies.next.startsWith('^'), true);
  assert.ok(pkg.dependencies.react);
  assert.ok(pkg.dependencies.pg);

  const tsconfig = await readNextFile('tsconfig.json');
  assert.match(tsconfig, /"jsx": "react-jsx"/);
  assert.match(tsconfig, /"@\/\*"/);
});

test('Next rewrite exposes a catch-all API route backed by shared handlers', async () => {
  const route = await readNextFile('app/api/[...path]/route.ts');
  const handlers = await readNextFile('src/server/api.ts');

  assert.match(route, /handleApiRequest/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /export async function PATCH/);
  assert.match(handlers, /customers/);
  assert.match(handlers, /appointments/);
  assert.match(handlers, /invoices/);
  assert.match(handlers, /payments/);
  assert.match(handlers, /inventory/);
});

test('Next rewrite keeps Supabase server secrets out of client code', async () => {
  const envExample = await readNextFile('.env.example');
  const db = await readNextFile('src/server/db.ts');
  const page = await readNextFile('app/page.tsx');

  assert.match(envExample, /DATABASE_URL=/);
  assert.match(envExample, /SESSION_SECRET=/);
  assert.match(envExample, /pooler\.supabase\.com/);
  assert.match(db, /process\.env\.DATABASE_URL/);
  assert.doesNotMatch(page, /DATABASE_URL|SESSION_SECRET|PGPASSWORD/);
});

test('Next rewrite documents the cutover from legacy app to Next app', async () => {
  const doc = await readNextFile('docs/next-rewrite-plan.md');

  assert.match(doc, /Foundation \+ Backend Parity/);
  assert.match(doc, /legacy app remains runnable/i);
  assert.match(doc, /Supabase Transaction pooler/i);
});

test('Next rewrite password verifier matches the seeded PBKDF2 credential contract', async () => {
  const domain = await readNextFile('src/server/domain.ts');

  assert.match(domain, /pbkdf2Sync/);
  assert.match(domain, /100000/);
  assert.match(domain, /sha512/);
  assert.doesNotMatch(domain, /scryptSync/);
});

test('Next rewrite gates prototype password login outside explicit non-production fallback', async () => {
  const handlers = await readNextFile('src/server/api.ts');
  const loginForm = await readNextFile('app/ui/login-form.tsx');
  const envExample = await readNextFile('.env.example');

  assert.match(handlers, /function isPrototypePasswordLoginAllowed/);
  assert.match(handlers, /ALLOW_PASSWORD_LOGIN/);
  assert.match(handlers, /Password login is disabled/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_ANON_KEY=/);
  assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.doesNotMatch(loginForm, /defaultValue="soorya"|defaultValue="password"/);
  assert.match(loginForm, /Continue with Google/);
});

test('Next rewrite authenticated UI includes an operational menu and core parlour sections', async () => {
  const page = await readNextFile('app/page.tsx');
  const shell = await readNextFile('app/ui/app-shell.tsx');

  for (const label of ['Dashboard', 'Bookings', 'Customers', 'Billing', 'Staff', 'Inventory', 'Settings']) {
    assert.match(shell, new RegExp(label));
  }

  assert.match(shell, /role-aware/i);
  assert.match(shell, /mobile-menu/i);
  assert.match(page, /getOperationalSnapshot/);
  assert.match(page, /AppShell/);
});

test('Next rewrite keeps core business writes attached to audit events', async () => {
  const handlers = await readNextFile('src/server/api.ts');

  for (const action of [
    'customer_created',
    'customer_updated',
    'booking_created',
    'booking_updated',
    'invoice_created',
    'payment_recorded',
    'booking_completed',
    'commission_calculation',
    'staff_created',
    'service_created',
    'inventory_item_created',
  ]) {
    assert.match(handlers, new RegExp(action));
  }

  assert.match(handlers, /insertAuditLog/);
  assert.match(handlers, /audit_logs/);
});

test('Next rewrite keeps CRM contact validation and WhatsApp consent parity', async () => {
  const handlers = await readNextFile('src/server/api.ts');
  const domain = await readNextFile('src/server/domain.ts');

  assert.match(domain, /function normalizeCountryCode/);
  assert.match(domain, /function normalizeCustomerPhone/);
  assert.match(domain, /function isValidEmail/);
  assert.match(handlers, /country_code/);
  assert.match(handlers, /whatsapp_consent/);
  assert.match(handlers, /Invalid email address/);
  assert.match(handlers, /Indian phone numbers/);
  assert.match(handlers, /SELECT country_code FROM customers WHERE id = \$1 AND tenant_id = \$2/);
});

test('Next rewrite keeps staff contact validation and bill service guards', async () => {
  const handlers = await readNextFile('src/server/api.ts');

  assert.match(handlers, /INSERT INTO staff \(id, tenant_id, name, country_code, phone/);
  assert.match(handlers, /normalizeCustomerPhone\(body\.phone, countryCode\)/);
  assert.match(handlers, /Commission value must be between 0 and 33/);
  assert.match(handlers, /At least one valid service is required before generating a bill/);
});

test('Next rewrite validates tenant ownership for booking and invoice references', async () => {
  const handlers = await readNextFile('src/server/api.ts');

  assert.match(handlers, /Invalid customer ID/);
  assert.match(handlers, /Invalid staff ID/);
  assert.match(handlers, /SELECT id FROM customers WHERE id = \$1 AND tenant_id = \$2/);
  assert.match(handlers, /SELECT id FROM staff WHERE id = \$1 AND tenant_id = \$2 AND status = \$3/);
});
