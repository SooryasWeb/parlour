import { NextRequest, NextResponse } from 'next/server';

import { clearSessionCookieHeader, createSessionCookieValue, sessionCookieHeader, verifySessionCookie } from './auth';
import { getClient, query } from './db';
import {
  calculateCommission,
  createId,
  isValidEmail,
  minutesFromTime,
  normalizeCountryCode,
  normalizeCustomerPhone,
  overlaps,
  verifyPassword,
} from './domain';

const permissions: Record<string, Record<string, string[]>> = {
  customers: {
    GET: ['admin', 'manager', 'receptionist', 'beautician'],
    POST: ['admin', 'manager', 'receptionist'],
    PATCH: ['admin', 'manager', 'receptionist'],
  },
  appointments: {
    GET: ['admin', 'manager', 'receptionist', 'beautician'],
    POST: ['admin', 'manager', 'receptionist'],
    PATCH: ['admin', 'manager', 'receptionist'],
  },
  staff: { GET: ['admin', 'manager'], POST: ['admin', 'manager'] },
  services: {
    GET: ['admin', 'manager', 'receptionist', 'beautician'],
    POST: ['admin', 'manager'],
  },
  invoices: {
    GET: ['admin', 'manager', 'receptionist', 'accountant'],
    POST: ['admin', 'manager', 'receptionist'],
  },
  payments: {
    GET: ['admin', 'manager', 'receptionist', 'accountant'],
    POST: ['admin', 'manager', 'receptionist', 'accountant'],
  },
  inventory: {
    GET: ['admin', 'manager', 'beautician'],
    POST: ['admin', 'manager'],
    PATCH: ['admin', 'manager'],
  },
};

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

function error(status: number, message: string, details?: unknown) {
  return json({ error: message, details }, status);
}

function requireFields(body: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

async function parseBody(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') return {};
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function isPrototypePasswordLoginAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_PASSWORD_LOGIN === 'true';
}

function getUser(request: NextRequest) {
  return verifySessionCookie(request.cookies.get('session_token')?.value);
}

function can(role: string, collection: string, method: string) {
  return permissions[collection]?.[method]?.includes(role) || false;
}

function auditDetails(details: unknown) {
  return JSON.stringify(details);
}

async function insertAuditLog(
  clientOrDb: { query: (text: string, params?: unknown[]) => Promise<unknown> },
  {
    tenantId,
    userId,
    action,
    entityName,
    entityId,
    details,
  }: {
    tenantId: string;
    userId: string;
    action: string;
    entityName: string;
    entityId: string;
    details: unknown;
  }
) {
  await clientOrDb.query(
    `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_name, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [createId('audit'), tenantId, userId, action, entityName, entityId, auditDetails(details)]
  );
}

export async function handleApiRequest(request: NextRequest, path: string[]) {
  try {
    const pathname = `/${path.join('/')}`;

    if (request.method === 'GET' && pathname === '/health') {
      return json({ ok: true, service: 'SooryasWeb Parlour App' });
    }

    if (request.method === 'POST' && pathname === '/auth/login') {
      if (!isPrototypePasswordLoginAllowed()) {
        return error(403, 'Password login is disabled. Continue with Google.');
      }

      const body = (await parseBody(request)) as Record<string, string>;
      requireFields(body, ['username', 'password']);

      const result = await query(
        'SELECT u.*, t.name as tenant_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.username = $1 AND u.status = $2',
        [body.username, 'active']
      );
      const user = result.rows[0];
      if (!user || !verifyPassword(body.password, user.password_hash)) {
        return error(401, 'Invalid username or password');
      }

      const sessionUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenant_id,
        tenantName: user.tenant_name,
      };
      return json(sessionUser, 200, { 'Set-Cookie': sessionCookieHeader(createSessionCookieValue(sessionUser)) });
    }

    if (request.method === 'POST' && pathname === '/auth/logout') {
      return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookieHeader() });
    }

    if (request.method === 'GET' && pathname === '/auth/me') {
      const user = getUser(request);
      return json(user ? { authenticated: true, ...user } : { authenticated: false });
    }

    const user = getUser(request);
    if (!user) return error(401, 'Unauthorized. Please login.');

    if (request.method === 'GET' && pathname === '/dashboard') {
      const [todayRes, revRes, custRes, lowStockRes] = await Promise.all([
        query('SELECT COUNT(*)::integer as count FROM bookings WHERE tenant_id = $1 AND date = CURRENT_DATE AND status != $2', [
          user.tenantId,
          'cancelled',
        ]),
        query("SELECT COALESCE(SUM(grand_total), 0)::numeric as total FROM invoices WHERE tenant_id = $1 AND status = 'paid' AND DATE(created_at) = CURRENT_DATE", [
          user.tenantId,
        ]),
        query('SELECT COUNT(*)::integer as count FROM customers WHERE tenant_id = $1', [user.tenantId]),
        query('SELECT name, stock_quantity, reorder_level FROM inventory_items WHERE tenant_id = $1 AND stock_quantity <= reorder_level', [
          user.tenantId,
        ]),
      ]);
      return json({
        todayAppointments: todayRes.rows[0].count,
        todayRevenue: Number.parseFloat(revRes.rows[0].total),
        customers: custRes.rows[0].count,
        lowStockItems: lowStockRes.rows,
      });
    }

    const collections = ['customers', 'appointments', 'staff', 'services', 'invoices', 'payments', 'inventory'];
    const matched = collections.find((name) => pathname === `/${name}` || pathname.startsWith(`/${name}/`));
    if (!matched) return error(404, 'API endpoint not found');
    if (!can(user.role, matched, request.method)) {
      return error(403, `Forbidden. Role "${user.role}" cannot ${request.method} ${matched}.`);
    }

    if (matched === 'customers') return handleCustomers(request, user.tenantId, user.username, pathname);
    if (matched === 'appointments') return handleAppointments(request, user.tenantId, user.username, pathname);
    if (matched === 'staff') return handleStaff(request, user.tenantId, user.username);
    if (matched === 'services') return handleServices(request, user.tenantId, user.username);
    if (matched === 'invoices') return handleInvoices(request, user.tenantId, user.username);
    if (matched === 'payments') return handlePayments(request, user.tenantId, user.username);
    if (matched === 'inventory') return handleInventory(request, user.tenantId, user.username, pathname);

    return error(405, 'Method not allowed');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const validationMessages = [
      'Missing required fields',
      'Invalid country code',
      'Phone number',
      'Indian phone numbers',
      'Invalid email address',
    ];
    return error(validationMessages.some((prefix) => message.startsWith(prefix)) ? 400 : 500, message);
  }
}

async function handleCustomers(request: NextRequest, tenantId: string, username: string, pathname: string) {
  if (request.method === 'GET') {
    const result = await query('SELECT * FROM customers WHERE tenant_id = $1 ORDER BY name ASC', [tenantId]);
    return json(result.rows);
  }
  if (request.method === 'POST') {
    const body = (await parseBody(request)) as Record<string, unknown>;
    requireFields(body, ['name', 'phone']);
    if (!isValidEmail(String(body.email || ''))) {
      return error(400, 'Invalid email address.');
    }
    const countryCode = normalizeCountryCode(String(body.countryCode || body.country_code || '+91'));
    const phone = normalizeCustomerPhone(String(body.phone), countryCode);
    const consentStatus = String(body.consentStatus || body.consent_status || 'unsigned');
    const consentDate = body.consentDate || body.consent_date || null;
    const whatsappConsent = body.whatsappConsent === true || body.whatsappConsent === 'true' || body.whatsapp_consent === true || body.whatsapp_consent === 'true';
    const result = await query(
      `INSERT INTO customers (id, tenant_id, name, country_code, phone, email, notes, consent_status, consent_date, whatsapp_consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        createId('customer'),
        tenantId,
        String(body.name),
        countryCode,
        phone,
        body.email ? String(body.email) : null,
        body.notes ? String(body.notes) : null,
        consentStatus,
        consentDate,
        whatsappConsent,
      ]
    );
    await insertAuditLog({ query }, {
      tenantId,
      userId: username,
      action: 'customer_created',
      entityName: 'customers',
      entityId: result.rows[0].id,
      details: {
        name: result.rows[0].name,
        phone: result.rows[0].phone,
        countryCode: result.rows[0].country_code,
        consentStatus: result.rows[0].consent_status,
        whatsappConsent: result.rows[0].whatsapp_consent,
      },
    });
    return json(result.rows[0], 201);
  }
  if (request.method === 'PATCH') {
    const id = pathname.split('/').pop();
    const body = (await parseBody(request)) as Record<string, unknown>;
    const updates: string[] = [];
    const values: unknown[] = [id, tenantId];
    let index = 3;
    let existingCountryCode: string | null = null;

    if ('phone' in body && !('countryCode' in body) && !('country_code' in body)) {
      const existing = await query('SELECT country_code FROM customers WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      existingCountryCode = existing.rows[0]?.country_code || '+91';
    }

    for (const [key, val] of Object.entries(body)) {
      const dbKey = ({
        countryCode: 'country_code',
        consentStatus: 'consent_status',
        consentDate: 'consent_date',
        whatsappConsent: 'whatsapp_consent',
      } as Record<string, string>)[key] || key;
      if (dbKey === 'email' && !isValidEmail(String(val))) {
        return error(400, 'Invalid email address.');
      }
      if (['name', 'phone', 'country_code', 'email', 'notes', 'consent_status', 'consent_date', 'whatsapp_consent'].includes(dbKey)) {
        updates.push(`${dbKey} = $${index}`);
        if (dbKey === 'country_code') {
          values.push(normalizeCountryCode(String(val)));
        } else if (dbKey === 'phone') {
          values.push(normalizeCustomerPhone(String(val), String(body.countryCode || body.country_code || existingCountryCode || '+91')));
        } else if (dbKey === 'whatsapp_consent') {
          values.push(val === true || val === 'true');
        } else {
          values.push(val);
        }
        index += 1;
      }
    }
    if (updates.length === 0) return error(400, 'No valid fields provided for update');
    const result = await query(`UPDATE customers SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`, values);
    if (result.rows.length) {
      await insertAuditLog({ query }, {
        tenantId,
        userId: username,
        action: 'customer_updated',
        entityName: 'customers',
        entityId: result.rows[0].id,
        details: {
          updatedFields: Object.keys(body).filter((key) => [
            'name',
            'phone',
            'countryCode',
            'country_code',
            'email',
            'notes',
            'consentStatus',
            'consent_status',
            'consentDate',
            'consent_date',
            'whatsappConsent',
            'whatsapp_consent',
          ].includes(key)),
        },
      });
    }
    return result.rows.length ? json(result.rows[0]) : error(404, 'Customer not found');
  }
  return error(405, 'Method not allowed');
}

async function handleAppointments(request: NextRequest, tenantId: string, username: string, pathname: string) {
  if (request.method === 'GET') {
    const result = await query(
      `SELECT b.*, c.name as customer_name, c.phone as phone, c.whatsapp_consent as whatsapp_consent, s.name as staff_name, sv.name as service_name
       FROM bookings b
       LEFT JOIN customers c ON b.customer_id = c.id
       LEFT JOIN staff s ON b.staff_id = s.id
       LEFT JOIN services sv ON b.service_id = sv.id
       WHERE b.tenant_id = $1 ORDER BY b.date DESC, b.start_time ASC`,
      [tenantId]
    );
    return json(result.rows);
  }
  if (request.method === 'POST') {
    const body = (await parseBody(request)) as Record<string, string>;
    requireFields(body, ['customerId', 'staffId', 'chairId', 'serviceId', 'date', 'startTime', 'endTime']);
    const conflictRes = await query(
      `SELECT b.*, s.name as staff_name
       FROM bookings b LEFT JOIN staff s ON b.staff_id = s.id
       WHERE b.tenant_id = $1 AND b.date = $2 AND b.status != 'cancelled' AND (b.staff_id = $3 OR b.chair_id = $4)`,
      [tenantId, body.date, body.staffId, body.chairId]
    );
    const conflicts = conflictRes.rows.filter((booking) =>
      overlaps(minutesFromTime(booking.start_time), minutesFromTime(booking.end_time), minutesFromTime(body.startTime), minutesFromTime(body.endTime))
    );
    if (conflicts.length > 0) {
      const type = conflicts[0].staff_id === body.staffId ? 'Staff member' : 'Chair/Station';
      return error(409, `Booking conflict: ${type} is already booked during this time slot.`, conflicts);
    }
    const svcRes = await query('SELECT price FROM services WHERE id = $1 AND tenant_id = $2', [body.serviceId, tenantId]);
    if (svcRes.rows.length === 0) return error(400, 'Invalid service ID');
    const customerRes = await query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [body.customerId, tenantId]);
    if (customerRes.rows.length === 0) return error(400, 'Invalid customer ID');
    const staffRes = await query('SELECT id FROM staff WHERE id = $1 AND tenant_id = $2 AND status = $3', [body.staffId, tenantId, 'active']);
    if (staffRes.rows.length === 0) return error(400, 'Invalid staff ID');
    const result = await query(
      `INSERT INTO bookings (id, tenant_id, customer_id, staff_id, chair_id, service_id, date, start_time, end_time, status, source, amount, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        createId('booking'),
        tenantId,
        body.customerId,
        body.staffId,
        body.chairId,
        body.serviceId,
        body.date,
        body.startTime,
        body.endTime,
        body.status || 'confirmed',
        body.source || 'walk-in',
        svcRes.rows[0].price,
        body.notes || null,
      ]
    );
    await insertAuditLog({ query }, {
      tenantId,
      userId: username,
      action: 'booking_created',
      entityName: 'bookings',
      entityId: result.rows[0].id,
      details: {
        customerId: result.rows[0].customer_id,
        staffId: result.rows[0].staff_id,
        chairId: result.rows[0].chair_id,
        serviceId: result.rows[0].service_id,
        date: result.rows[0].date,
        startTime: result.rows[0].start_time,
        endTime: result.rows[0].end_time,
      },
    });
    return json(result.rows[0], 201);
  }
  if (request.method === 'PATCH') {
    const id = pathname.split('/').pop();
    const body = (await parseBody(request)) as Record<string, unknown>;
    const updates: string[] = [];
    const values: unknown[] = [id, tenantId];
    let index = 3;
    for (const [key, val] of Object.entries(body)) {
      if (['customer_id', 'staff_id', 'chair_id', 'service_id', 'date', 'start_time', 'end_time', 'status', 'source', 'amount', 'notes'].includes(key)) {
        updates.push(`${key} = $${index}`);
        values.push(val);
        index += 1;
      }
    }
    if (updates.length === 0) return error(400, 'No valid fields provided for update');
    const result = await query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`, values);
    if (result.rows.length) {
      await insertAuditLog({ query }, {
        tenantId,
        userId: username,
        action: 'booking_updated',
        entityName: 'bookings',
        entityId: result.rows[0].id,
        details: { updatedFields: Object.keys(body).filter((key) => ['customer_id', 'staff_id', 'chair_id', 'service_id', 'date', 'start_time', 'end_time', 'status', 'source', 'amount', 'notes'].includes(key)) },
      });
    }
    return result.rows.length ? json(result.rows[0]) : error(404, 'Booking not found');
  }
  return error(405, 'Method not allowed');
}

async function handleStaff(request: NextRequest, tenantId: string, username: string) {
  if (request.method === 'GET') {
    const result = await query('SELECT * FROM staff WHERE tenant_id = $1 ORDER BY name ASC', [tenantId]);
    return json(result.rows);
  }
  const body = (await parseBody(request)) as Record<string, string>;
  requireFields(body, ['name', 'phone', 'role', 'commissionType', 'commissionValue']);
  const countryCode = normalizeCountryCode(body.countryCode || body.country_code || '+91');
  const phone = normalizeCustomerPhone(body.phone, countryCode);
  const commissionValue = Number.parseFloat(body.commissionValue);
  if (!Number.isFinite(commissionValue) || commissionValue < 0 || commissionValue > 33) {
    return error(400, 'Commission value must be between 0 and 33.');
  }
  const result = await query(
    `INSERT INTO staff (id, tenant_id, name, country_code, phone, role, commission_type, commission_value, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [createId('staff'), tenantId, body.name, countryCode, phone, body.role, body.commissionType, commissionValue, 'active']
  );
  await insertAuditLog({ query }, {
    tenantId,
    userId: username,
    action: 'staff_created',
    entityName: 'staff',
    entityId: result.rows[0].id,
    details: {
      name: result.rows[0].name,
      countryCode: result.rows[0].country_code,
      role: result.rows[0].role,
      commissionType: result.rows[0].commission_type,
      commissionValue: result.rows[0].commission_value,
    },
  });
  return json(result.rows[0], 201);
}

async function handleServices(request: NextRequest, tenantId: string, username: string) {
  if (request.method === 'GET') {
    const result = await query('SELECT * FROM services WHERE tenant_id = $1 AND is_active = TRUE ORDER BY name ASC', [tenantId]);
    return json(result.rows);
  }
  const body = (await parseBody(request)) as Record<string, string>;
  requireFields(body, ['name', 'durationMinutes', 'price']);
  const result = await query(
    `INSERT INTO services (id, tenant_id, name, duration_minutes, price, tax_class)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [createId('service'), tenantId, body.name, Number.parseInt(body.durationMinutes, 10), Number.parseFloat(body.price), body.taxClass || 'exempt']
  );
  await insertAuditLog({ query }, {
    tenantId,
    userId: username,
    action: 'service_created',
    entityName: 'services',
    entityId: result.rows[0].id,
    details: {
      name: result.rows[0].name,
      durationMinutes: result.rows[0].duration_minutes,
      price: result.rows[0].price,
      taxClass: result.rows[0].tax_class,
    },
  });
  return json(result.rows[0], 201);
}

async function handleInvoices(request: NextRequest, tenantId: string, username: string) {
  if (request.method === 'GET') {
    const result = await query(
      `SELECT i.*, c.name as customer_name, c.phone as phone, c.whatsapp_consent as whatsapp_consent FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.tenant_id = $1 ORDER BY i.created_at DESC`,
      [tenantId]
    );
    return json(result.rows);
  }
  const body = (await parseBody(request)) as { customerId: string; bookingId?: string; discountTotal?: number; items: Array<{ serviceId: string; quantity?: number; unitPrice?: number }> };
  requireFields(body as unknown as Record<string, unknown>, ['customerId', 'items']);
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.some((item) => !item?.serviceId)) {
    return error(400, 'At least one valid service is required before generating a bill.');
  }
  let subtotal = 0;
  let taxTotal = 0;
  const itemDetails = [];
  const customerRes = await query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [body.customerId, tenantId]);
  if (customerRes.rows.length === 0) return error(400, 'Invalid customer ID');
  for (const item of body.items) {
    const svcRes = await query('SELECT price, tax_class FROM services WHERE id = $1 AND tenant_id = $2', [item.serviceId, tenantId]);
    if (svcRes.rows.length === 0) return error(400, `Invalid service ID: ${item.serviceId}`);
    const unitPrice = Number(item.unitPrice || svcRes.rows[0].price);
    const quantity = Number(item.quantity || 1);
    const taxAmount = svcRes.rows[0].tax_class === 'GST-18' ? Number((unitPrice * quantity * 0.18).toFixed(2)) : 0;
    subtotal += unitPrice * quantity;
    taxTotal += taxAmount;
    itemDetails.push({ serviceId: item.serviceId, quantity, unitPrice, taxAmount });
  }
  const discountTotal = Number(body.discountTotal || 0);
  const grandTotal = Math.max(subtotal + taxTotal - discountTotal, 0);
  const currentYear = new Date().getFullYear();
  const invoiceId = createId('invoice');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const seq = await client.query(
      `INSERT INTO invoice_sequences (tenant_id, invoice_year, last_number)
       VALUES ($1, $2, 1)
       ON CONFLICT (tenant_id, invoice_year)
       DO UPDATE SET last_number = invoice_sequences.last_number + 1, updated_at = CURRENT_TIMESTAMP
       RETURNING last_number`,
      [tenantId, currentYear]
    );
    const invoiceNumber = `INV-${currentYear}-${String(seq.rows[0].last_number).padStart(4, '0')}`;
    await client.query(
      `INSERT INTO invoices (id, tenant_id, invoice_number, customer_id, booking_id, subtotal, tax_total, discount_total, grand_total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [invoiceId, tenantId, invoiceNumber, body.customerId, body.bookingId || null, subtotal, taxTotal, discountTotal, grandTotal, 'draft']
    );
    for (const item of itemDetails) {
      await client.query(
        `INSERT INTO invoice_items (id, invoice_id, service_id, quantity, unit_price, tax_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [createId('invitem'), invoiceId, item.serviceId, item.quantity, item.unitPrice, item.taxAmount]
      );
    }
    await insertAuditLog(client, {
      tenantId,
      userId: username,
      action: 'invoice_created',
      entityName: 'invoices',
      entityId: invoiceId,
      details: {
        invoiceNumber,
        customerId: body.customerId,
        bookingId: body.bookingId || null,
        grandTotal,
        itemCount: itemDetails.length,
      },
    });
    await client.query('COMMIT');
    return json({ id: invoiceId, invoiceNumber, customerId: body.customerId, bookingId: body.bookingId || null, subtotal, taxTotal, discountTotal, grandTotal, status: 'draft' }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    return error(500, 'Database transaction failed', err instanceof Error ? err.message : err);
  } finally {
    client.release();
  }
}

async function handlePayments(request: NextRequest, tenantId: string, username: string) {
  if (request.method === 'GET') {
    const result = await query('SELECT * FROM payments WHERE tenant_id = $1 ORDER BY payment_date DESC', [tenantId]);
    return json(result.rows);
  }
  const body = (await parseBody(request)) as Record<string, string>;
  requireFields(body, ['invoiceId', 'amount', 'paymentMode']);
  const paymentAmount = Number.parseFloat(body.amount);
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) return error(400, 'Payment amount must be greater than zero.');
  const id = createId('payment');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const invRes = await client.query('SELECT grand_total FROM invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [body.invoiceId, tenantId]);
    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return error(404, 'Invoice not found');
    }
    await client.query(
      `INSERT INTO payments (id, tenant_id, invoice_id, amount, payment_mode, reference_number)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, tenantId, body.invoiceId, paymentAmount, body.paymentMode, body.referenceNumber || null]
    );
    await insertAuditLog(client, {
      tenantId,
      userId: username,
      action: 'payment_recorded',
      entityName: 'payments',
      entityId: id,
      details: {
        invoiceId: body.invoiceId,
        amount: paymentAmount,
        paymentMode: body.paymentMode,
        referenceNumber: body.referenceNumber || null,
      },
    });
    const totalRes = await client.query('SELECT COALESCE(SUM(amount), 0)::numeric as total_paid FROM payments WHERE invoice_id = $1 AND tenant_id = $2', [
      body.invoiceId,
      tenantId,
    ]);
    const totalPaid = Number.parseFloat(totalRes.rows[0].total_paid);
    const grandTotal = Number.parseFloat(invRes.rows[0].grand_total);
    const nextStatus = totalPaid >= grandTotal ? 'paid' : 'partially_paid';
    await client.query('UPDATE invoices SET status = $1 WHERE id = $2 AND tenant_id = $3', [nextStatus, body.invoiceId, tenantId]);
    if (nextStatus === 'paid') {
      const bookingRes = await client.query(
        `SELECT b.id as booking_id, b.staff_id, b.amount, s.name as staff_name, s.commission_type, s.commission_value
         FROM bookings b JOIN staff s ON b.staff_id = s.id JOIN invoices i ON i.booking_id = b.id
         WHERE i.id = $1 AND b.tenant_id = $2 AND b.status = 'confirmed'`,
        [body.invoiceId, tenantId]
      );
      if (bookingRes.rows.length > 0) {
        const booking = bookingRes.rows[0];
        const commission = calculateCommission(Number(booking.amount), booking.commission_type, Number(booking.commission_value));
        await client.query('UPDATE bookings SET status = $1 WHERE id = $2 AND tenant_id = $3', ['completed', booking.booking_id, tenantId]);
        await insertAuditLog(client, {
          tenantId,
          userId: username,
          action: 'booking_completed',
          entityName: 'bookings',
          entityId: booking.booking_id,
          details: { invoiceId: body.invoiceId, paymentId: id, totalPaid },
        });
        await insertAuditLog(client, {
          tenantId,
          userId: username,
          action: 'commission_calculation',
          entityName: 'staff',
          entityId: booking.staff_id,
          details: {
            staffName: booking.staff_name,
            bookingId: booking.booking_id,
            invoiceId: body.invoiceId,
            commission,
          },
        });
      }
    }
    await client.query('COMMIT');
    return json({ id, status: 'success', invoiceStatus: nextStatus, totalPaid, balanceDue: Math.max(grandTotal - totalPaid, 0) }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    return error(500, 'Database transaction failed', err instanceof Error ? err.message : err);
  } finally {
    client.release();
  }
}

async function handleInventory(request: NextRequest, tenantId: string, username: string, pathname: string) {
  if (request.method === 'GET') {
    const result = await query('SELECT * FROM inventory_items WHERE tenant_id = $1 ORDER BY name ASC', [tenantId]);
    return json(result.rows);
  }
  if (request.method === 'POST') {
    const body = (await parseBody(request)) as Record<string, string>;
    requireFields(body, ['name', 'type', 'stockQuantity']);
    const result = await query(
      `INSERT INTO inventory_items (id, tenant_id, name, type, stock_quantity, reorder_level, vendor_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [createId('inventory'), tenantId, body.name, body.type, Number.parseInt(body.stockQuantity, 10), Number.parseInt(body.reorderLevel || '5', 10), body.vendorName || null]
    );
    await insertAuditLog({ query }, {
      tenantId,
      userId: username,
      action: 'inventory_item_created',
      entityName: 'inventory_items',
      entityId: result.rows[0].id,
      details: {
        name: result.rows[0].name,
        type: result.rows[0].type,
        stockQuantity: result.rows[0].stock_quantity,
        reorderLevel: result.rows[0].reorder_level,
      },
    });
    return json(result.rows[0], 201);
  }
  if (request.method === 'PATCH') {
    const id = pathname.split('/').pop();
    const body = (await parseBody(request)) as Record<string, unknown>;
    const updates: string[] = [];
    const values: unknown[] = [id, tenantId];
    let index = 3;
    for (const [key, val] of Object.entries(body)) {
      if (['name', 'type', 'stock_quantity', 'reorder_level', 'vendor_name'].includes(key)) {
        updates.push(`${key} = $${index}`);
        values.push(key === 'stock_quantity' || key === 'reorder_level' ? Number.parseInt(String(val), 10) : val);
        index += 1;
      }
    }
    if (updates.length === 0) return error(400, 'No valid fields provided for update');
    const result = await query(`UPDATE inventory_items SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`, values);
    return result.rows.length ? json(result.rows[0]) : error(404, 'Inventory item not found');
  }
  return error(405, 'Method not allowed');
}
