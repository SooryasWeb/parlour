import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { clearSessionStoreForTests, createApp } from '../src/server.js';
import * as db from '../src/db.js';

// Helper to launch the server and wrap testing logic
async function withServer(fn) {
  // Set host/env configurations if needed, force-reset schema for test consistency
  await db.initDb(true);

  const app = await createApp();
  const server = await app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await fn(baseUrl);
  } finally {
    await app.close();
  }
}

// Global cleanup after all tests complete
test.after(async () => {
  await db.closePool();
});

async function login(baseUrl, username = 'soorya') {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'password' }),
  });
  assert.equal(loginRes.status, 200);
  return loginRes.headers.get('set-cookie');
}

async function createInvoice(baseUrl, cookie, overrides = {}) {
  const invRes = await fetch(`${baseUrl}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      customerId: 'customer-meera',
      items: [{ serviceId: 'service-facial', quantity: 1 }],
      discountTotal: 100,
      ...overrides,
    }),
  });
  const invoice = await invRes.json();
  assert.equal(invRes.status, 201);
  return invoice;
}

test('test runner uses only the protected _test database for destructive resets', async () => {
  assert.match(db.getDatabaseName(), /_test$/);
});

test('GET /api/health returns health status', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.match(body.service, /SooryasWeb Parlour App/);
  });
});

test('POST /api/auth/login sets session token cookie', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'soorya', password: 'password' }),
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.username, 'soorya');
    assert.equal(body.role, 'admin');

    const cookie = response.headers.get('set-cookie');
    assert.ok(cookie);
    assert.match(cookie, /session_token=session-/);
  });
});

test('GET /api/dashboard blocks unauthorized users', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.error, 'Unauthorized. Please login.');
  });
});

test('GET /api/dashboard returns parlour analytics when authenticated', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    // Fetch dashboard with session cookie
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Cookie: cookie },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok('todayAppointments' in body);
    assert.ok('todayRevenue' in body);
    assert.equal(body.customers, 2); // Seed has 2 customers
  });
});

test('POST /api/customers validates phone country code and optional email', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    const invalidPhone = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Invalid Phone', countryCode: '+91', phone: '12345', email: 'valid@example.com' }),
    });
    const invalidPhoneBody = await invalidPhone.json();
    assert.equal(invalidPhone.status, 400);
    assert.match(invalidPhoneBody.error, /Indian phone numbers must have 10 digits/);

    const invalidEmail = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Invalid Email', countryCode: '+91', phone: '9847011111', email: 'not-an-email' }),
    });
    const invalidEmailBody = await invalidEmail.json();
    assert.equal(invalidEmail.status, 400);
    assert.match(invalidEmailBody.error, /Invalid email address/);
  });
});

test('POST /api/customers stores editable country code and WhatsApp consent', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    const response = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'WhatsApp Consent Customer',
        countryCode: '+971',
        phone: '501234567',
        email: 'customer@example.com',
        whatsappConsent: true,
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.country_code, '+971');
    assert.equal(body.phone, '+971501234567');
    assert.equal(body.email, 'customer@example.com');
    assert.equal(body.whatsapp_consent, true);
  });
});

test('PATCH /api/customers keeps saved country code when phone is edited alone', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    const create = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Dubai Customer',
        countryCode: '+971',
        phone: '501234567',
        email: 'dubai.customer@example.com',
      }),
    });
    const customer = await create.json();
    assert.equal(create.status, 201);

    const update = await fetch(`${baseUrl}/api/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ phone: '509876543' }),
    });
    const body = await update.json();

    assert.equal(update.status, 200);
    assert.equal(body.country_code, '+971');
    assert.equal(body.phone, '+971509876543');
  });
});

test('POST /api/staff validates country code phone and commission range', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    const invalidPhone = await fetch(`${baseUrl}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Invalid Staff Phone',
        countryCode: '+91',
        phone: '12345',
        role: 'beautician',
        commissionType: 'percentage',
        commissionValue: 12,
      }),
    });
    const invalidPhoneBody = await invalidPhone.json();
    assert.equal(invalidPhone.status, 400);
    assert.match(invalidPhoneBody.error, /Indian phone numbers must have 10 digits/);

    const invalidCommission = await fetch(`${baseUrl}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Invalid Staff Commission',
        countryCode: '+91',
        phone: '9847012345',
        role: 'beautician',
        commissionType: 'percentage',
        commissionValue: 34,
      }),
    });
    const invalidCommissionBody = await invalidCommission.json();
    assert.equal(invalidCommission.status, 400);
    assert.match(invalidCommissionBody.error, /Commission value must be between 0 and 33/);
  });
});

test('POST /api/staff stores editable country code and normalized staff phone', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    const response = await fetch(`${baseUrl}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'International Staff',
        countryCode: '+971',
        phone: '501234567',
        role: 'beautician',
        commissionType: 'percentage',
        commissionValue: 20,
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.country_code, '+971');
    assert.equal(body.phone, '+971501234567');
    assert.equal(Number(body.commission_value), 20);
  });
});

test('signed session cookie authenticates after in-memory session store is cleared', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);
    clearSessionStoreForTests();

    const response = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Cookie: cookie },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok('todayAppointments' in body);
  });
});

test('POST /api/appointments rejects overlapping same-chair or same-staff bookings', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    // Create a first appointment (10:00 to 11:00 on chair-1 with staff-priya)
    const first = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerId: 'customer-meera',
        staffId: 'staff-priya',
        chairId: 'chair-1',
        serviceId: 'service-facial',
        date: '2026-06-11',
        startTime: '10:00',
        endTime: '11:00',
      }),
    });
    assert.equal(first.status, 201);

    // Try booking second appointment (10:30 to 11:30) with the SAME staff (staff-priya) on a DIFFERENT chair (chair-2) -> Should fail!
    const second = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerId: 'customer-lekshmi',
        staffId: 'staff-priya',
        chairId: 'chair-2',
        serviceId: 'service-haircut',
        date: '2026-06-11',
        startTime: '10:30',
        endTime: '11:30',
      }),
    });
    assert.equal(second.status, 409);

    // Try booking third appointment (10:30 to 11:30) with a DIFFERENT staff (staff-anisha) on the SAME chair (chair-1) -> Should fail!
    const third = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerId: 'customer-lekshmi',
        staffId: 'staff-anisha',
        chairId: 'chair-1',
        serviceId: 'service-haircut',
        date: '2026-06-11',
        startTime: '10:30',
        endTime: '11:30',
      }),
    });
    assert.equal(third.status, 409);
  });
});

test('POST /api/invoices and payments workflow computes tax and completes payments', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);
    const invoice = await createInvoice(baseUrl, cookie);
    assert.equal(invoice.subtotal, 1800);
    assert.equal(invoice.taxTotal, 324); // 18% of 1800
    assert.equal(invoice.discountTotal, 100);
    assert.equal(invoice.grandTotal, 2024); // 1800 + 324 - 100
    assert.equal(invoice.status, 'draft');

    // Record payment against the invoice
    const payRes = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        invoiceId: invoice.id,
        amount: 2024,
        paymentMode: 'UPI',
        referenceNumber: 'UPI-123456',
      }),
    });
    const payment = await payRes.json();
    assert.equal(payRes.status, 201);
    assert.equal(payment.status, 'success');
    assert.equal(payment.invoiceStatus, 'paid');

    // Check that invoice status is now 'paid'
    const invListRes = await fetch(`${baseUrl}/api/invoices`, {
      headers: { Cookie: cookie },
    });
    const invoices = await invListRes.json();
    const updatedInvoice = invoices.find((i) => i.id === invoice.id);
    assert.equal(updatedInvoice.status, 'paid');
  });
});

test('POST /api/payments keeps invoice partially paid until ledger covers grand total', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);
    const invoice = await createInvoice(baseUrl, cookie);

    const firstPayRes = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        invoiceId: invoice.id,
        amount: 1000,
        paymentMode: 'UPI',
        referenceNumber: 'UPI-PARTIAL',
      }),
    });
    const firstPayment = await firstPayRes.json();
    assert.equal(firstPayRes.status, 201);
    assert.equal(firstPayment.invoiceStatus, 'partially_paid');
    assert.equal(firstPayment.balanceDue, 1024);

    let invListRes = await fetch(`${baseUrl}/api/invoices`, { headers: { Cookie: cookie } });
    let invoices = await invListRes.json();
    assert.equal(invoices.find((i) => i.id === invoice.id).status, 'partially_paid');

    const secondPayRes = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        invoiceId: invoice.id,
        amount: 1024,
        paymentMode: 'cash',
      }),
    });
    const secondPayment = await secondPayRes.json();
    assert.equal(secondPayRes.status, 201);
    assert.equal(secondPayment.invoiceStatus, 'paid');

    invListRes = await fetch(`${baseUrl}/api/invoices`, { headers: { Cookie: cookie } });
    invoices = await invListRes.json();
    assert.equal(invoices.find((i) => i.id === invoice.id).status, 'paid');
  });
});

test('POST /api/invoices uses sequential numbers without COUNT-based gaps inside the same year', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);
    const first = await createInvoice(baseUrl, cookie);
    const second = await createInvoice(baseUrl, cookie);
    const currentYear = new Date().getFullYear();

    assert.equal(first.invoiceNumber, `INV-${currentYear}-0001`);
    assert.equal(second.invoiceNumber, `INV-${currentYear}-0002`);
  });
});

test('POST /api/invoices rejects missing service line before database transaction', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    const response = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerId: 'customer-meera',
        items: [{ quantity: 1 }],
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /At least one valid service is required/);
  });
});

test('RBAC blocks accountant from mutating parlour operations', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl, 'accountant');

    const staffRes = await fetch(`${baseUrl}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Temporary Staff',
        role: 'beautician',
        commissionType: 'fixed',
        commissionValue: 100,
      }),
    });
    const staffBody = await staffRes.json();
    assert.equal(staffRes.status, 403);
    assert.match(staffBody.error, /accountant/);

    const invoicesRes = await fetch(`${baseUrl}/api/invoices`, { headers: { Cookie: cookie } });
    assert.equal(invoicesRes.status, 200);
  });
});

test('business writes create tenant-scoped audit logs with actor and entity context', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    const customerRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Audit Customer',
        phone: '9847099999',
        notes: 'Prefers afternoon appointments.',
      }),
    });
    const customer = await customerRes.json();
    assert.equal(customerRes.status, 201);

    const bookingRes = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerId: customer.id,
        staffId: 'staff-priya',
        chairId: 'chair-1',
        serviceId: 'service-facial',
        date: '2026-06-12',
        startTime: '14:00',
        endTime: '15:00',
        source: 'phone',
      }),
    });
    const booking = await bookingRes.json();
    assert.equal(bookingRes.status, 201);

    const invoice = await createInvoice(baseUrl, cookie, {
      customerId: customer.id,
      bookingId: booking.id,
    });

    const paymentRes = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        invoiceId: invoice.id,
        amount: invoice.grandTotal,
        paymentMode: 'UPI',
        referenceNumber: 'UPI-AUDIT',
      }),
    });
    assert.equal(paymentRes.status, 201);

    const auditRes = await db.query(
      `SELECT action, entity_name, entity_id, user_id, tenant_id, details
       FROM audit_logs
       WHERE tenant_id = $1
       ORDER BY timestamp ASC`,
      ['tenant-sooryas']
    );

    const rows = auditRes.rows;
    assert.ok(
      rows.some((row) =>
        row.action === 'customer_created' &&
        row.entity_name === 'customers' &&
        row.entity_id === customer.id &&
        row.user_id === 'soorya' &&
        row.details.includes('Audit Customer')
      )
    );
    assert.ok(rows.some((row) => row.action === 'booking_created' && row.entity_name === 'bookings' && row.entity_id === booking.id));
    assert.ok(rows.some((row) => row.action === 'invoice_created' && row.entity_name === 'invoices' && row.entity_id === invoice.id));
    assert.ok(rows.some((row) => row.action === 'payment_recorded' && row.entity_name === 'payments'));
    assert.ok(rows.some((row) => row.action === 'booking_completed' && row.entity_name === 'bookings' && row.entity_id === booking.id));
  });
});

test('staff service and inventory writes create tenant-scoped audit logs', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    const staffRes = await fetch(`${baseUrl}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Audit Staff',
        phone: '9847000001',
        role: 'beautician',
        commissionType: 'percentage',
        commissionValue: 12,
      }),
    });
    const staff = await staffRes.json();
    assert.equal(staffRes.status, 201);

    const serviceRes = await fetch(`${baseUrl}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Audit Service',
        durationMinutes: 30,
        price: 500,
        taxClass: 'exempt',
      }),
    });
    const service = await serviceRes.json();
    assert.equal(serviceRes.status, 201);

    const inventoryRes = await fetch(`${baseUrl}/api/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        name: 'Audit Stock',
        type: 'consumable',
        stockQuantity: 10,
        reorderLevel: 2,
        vendorName: 'Audit Vendor',
      }),
    });
    const inventory = await inventoryRes.json();
    assert.equal(inventoryRes.status, 201);

    const auditRes = await db.query(
      `SELECT action, entity_name, entity_id, user_id, tenant_id, details
       FROM audit_logs
       WHERE tenant_id = $1`,
      ['tenant-sooryas']
    );
    const rows = auditRes.rows;

    assert.ok(rows.some((row) => row.action === 'staff_created' && row.entity_name === 'staff' && row.entity_id === staff.id));
    assert.ok(rows.some((row) => row.action === 'service_created' && row.entity_name === 'services' && row.entity_id === service.id));
    assert.ok(rows.some((row) => row.action === 'inventory_item_created' && row.entity_name === 'inventory_items' && row.entity_id === inventory.id));
    assert.ok(rows.every((row) => row.user_id === 'soorya'));
  });
});

test('tenant isolation blocks cross-tenant booking and invoice references', async () => {
  await withServer(async (baseUrl) => {
    const cookie = await login(baseUrl);

    await db.query(
      `INSERT INTO tenants (id, name, subdomain, address, phone)
       VALUES ($1, $2, $3, $4, $5)`,
      ['tenant-other', 'Other Beauty', 'otherbeauty', 'Kochi, Kerala', '+919999999999']
    );
    await db.query(
      `INSERT INTO customers (id, tenant_id, name, phone, consent_status)
       VALUES ($1, $2, $3, $4, $5)`,
      ['customer-other', 'tenant-other', 'Other Customer', '9999999999', 'signed']
    );
    await db.query(
      `INSERT INTO staff (id, tenant_id, name, role, commission_type, commission_value, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['staff-other', 'tenant-other', 'Other Staff', 'beautician', 'fixed', 100, 'active']
    );

    const foreignCustomerBooking = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerId: 'customer-other',
        staffId: 'staff-priya',
        chairId: 'chair-1',
        serviceId: 'service-facial',
        date: '2026-06-13',
        startTime: '10:00',
        endTime: '11:00',
      }),
    });
    const foreignCustomerBody = await foreignCustomerBooking.json();
    assert.equal(foreignCustomerBooking.status, 400);
    assert.match(foreignCustomerBody.error, /Invalid customer ID/);

    const foreignStaffBooking = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerId: 'customer-meera',
        staffId: 'staff-other',
        chairId: 'chair-1',
        serviceId: 'service-facial',
        date: '2026-06-13',
        startTime: '11:30',
        endTime: '12:30',
      }),
    });
    const foreignStaffBody = await foreignStaffBooking.json();
    assert.equal(foreignStaffBooking.status, 400);
    assert.match(foreignStaffBody.error, /Invalid staff ID/);

    const foreignCustomerInvoice = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerId: 'customer-other',
        items: [{ serviceId: 'service-facial', quantity: 1 }],
      }),
    });
    const foreignInvoiceBody = await foreignCustomerInvoice.json();
    assert.equal(foreignCustomerInvoice.status, 400);
    assert.match(foreignInvoiceBody.error, /Invalid customer ID/);
  });
});

test('frontend files do not contain common mojibake markers', async () => {
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(`${index}\n${app}`, /Ã|Â|â€|âœ|ðŸ|à´|àµ/);
});

test('legacy frontend escapes API data before rendering with innerHTML', async () => {
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(app, /function escapeHtml/);
  assert.doesNotMatch(app, /\$\{\s*item\.(?!status\s*===|stock_quantity\s*<=|date\.slice|phone\s*\|\||whatsapp_consent\s*\?)/);
  assert.doesNotMatch(app, /\$\{\s*c\.(?!id)/);
  assert.doesNotMatch(app, /\$\{\s*s\.(?!id)/);
  assert.doesNotMatch(app, /\$\{\s*sv\.(?!id|price)/);
});

test('legacy Customer CRM exposes contact validation fields and consent-gated WhatsApp actions', async () => {
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');

  assert.match(index, /id="customer-country-code"/);
  assert.match(index, /value="\+91"/);
  assert.match(index, /id="customer-phone"/);
  assert.match(index, /id="customer-email"/);
  assert.match(index, /id="customer-whatsapp-consent"/);
  assert.match(index, /Customer consents to reminders and invoices via WhatsApp/);
  assert.match(app, /function validateCustomerPayload/);
  assert.match(app, /Invalid email address/);
  assert.match(app, /function canUseWhatsApp/);
  assert.match(app, /WhatsApp Consent Needed/);
  assert.match(css, /\.checkbox-row/);
});

test('legacy forms constrain customer and staff contact fields for mobile entry', async () => {
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');

  assert.match(index, /id="customer-country-code"[\s\S]*maxlength="4"/);
  assert.match(index, /id="customer-phone"[\s\S]*maxlength="10"[\s\S]*pattern="\[0-9\]\{10\}"/);
  assert.match(index, /id="staff-country-code"[\s\S]*value="\+91"[\s\S]*maxlength="4"/);
  assert.match(index, /id="staff-phone"[\s\S]*maxlength="10"[\s\S]*pattern="\[0-9\]\{10\}"/);
  assert.match(index, /id="staff-commission-val"[\s\S]*min="0"[\s\S]*max="33"/);
  assert.match(app, /function validateStaffPayload/);
  assert.match(css, /\.country-phone-row/);
});

test('legacy frontend CSS keeps mobile/tablet controls compact and avoids oversized card radii', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  const radii = [...css.matchAll(/border-radius:\s*(\d+)px/g)].map((match) => Number(match[1]));
  const compactSurfaceRadii = radii.filter((radius) => radius !== 34 && radius !== 999);

  assert.ok(radii.length > 0);
  assert.ok(
    compactSurfaceRadii.every((radius) => radius <= 12),
    `Found oversized surface radius values: ${compactSurfaceRadii.filter((radius) => radius > 12).join(', ')}`
  );
  assert.match(css, /@media \(max-width: 1024px\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.nav\s*{[\s\S]*overflow-x: auto/);
  assert.match(css, /\.field-row\s*{[\s\S]*grid-template-columns: 1fr/);
});

test('GET / serves the frontend static assets', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /<!doctype html>/i);
  });
});
