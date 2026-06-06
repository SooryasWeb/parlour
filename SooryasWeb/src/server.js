import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createId,
  isValidEmail,
  normalizeCountryCode,
  normalizeCustomerPhone,
  normalizePhone,
  minutesFromTime,
  overlaps,
  verifyPassword,
  calculateCommission,
} from './domain.js';
import * as db from './db.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// In-memory sessions storage (token -> { user, expiresAt })
const sessions = new Map();

const permissions = {
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
  staff: {
    GET: ['admin', 'manager'],
    POST: ['admin', 'manager'],
  },
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

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function sendError(res, status, message, details = undefined) {
  sendJson(res, status, { error: message, details });
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function required(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production.');
  }
  return 'sooryas-local-development-session-secret';
}

function signSessionPayload(payload) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

function createSessionCookieValue(user) {
  const payload = Buffer.from(
    JSON.stringify({
      ...user,
      exp: Date.now() + SESSION_TTL_MS,
    })
  ).toString('base64url');
  return `session-${payload}.${signSessionPayload(payload)}`;
}

function verifySessionCookie(value) {
  if (!value?.startsWith('session-')) return null;
  const raw = value.slice('session-'.length);
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;

  const expected = signSessionPayload(payload);
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);
  if (expectedBytes.length !== signatureBytes.length || !timingSafeEqual(expectedBytes, signatureBytes)) {
    return null;
  }

  const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!user.exp || user.exp <= Date.now()) return null;
  delete user.exp;
  return user;
}

// Authentication check middleware
function getAuthenticatedUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.session_token;
  if (!token) return null;
  const signedUser = verifySessionCookie(token);
  if (signedUser) return signedUser;

  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}

export function clearSessionStoreForTests() {
  sessions.clear();
}

function cookieSecuritySuffix() {
  return process.env.NODE_ENV === 'production' ? '; Secure' : '';
}

function hasPermission(user, collection, method) {
  return permissions[collection]?.[method]?.includes(user.role) || false;
}

function auditDetails(details) {
  return JSON.stringify(details);
}

async function insertAuditLog(clientOrDb, { tenantId, userId, action, entityName, entityId, details }) {
  await clientOrDb.query(
    `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_name, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      createId('audit'),
      tenantId,
      userId,
      action,
      entityName,
      entityId,
      auditDetails(details),
    ]
  );
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendError(res, 403, 'Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=300',
    });
    res.end(content);
  } catch {
    try {
      const fallback = await readFile(join(publicDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
      res.end(fallback);
    } catch (err) {
      sendError(res, 500, 'Internal server error reading index.html');
    }
  }
}

export async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;

  // 1. PUBLIC ROUTES: Health & Auth Login/Logout/Me
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'SooryasWeb Parlour App' });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const body = await parseBody(req);
    required(body, ['username', 'password']);

    const userRes = await db.query(
      'SELECT u.*, t.name as tenant_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.username = $1 AND u.status = $2',
      [body.username, 'active']
    );

    const user = userRes.rows[0];
    if (!user || !verifyPassword(body.password, user.password_hash)) {
      sendError(res, 401, 'Invalid username or password');
      return;
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
    };
    const token = createSessionCookieValue(sessionUser);
    sessions.set(token, {
      user: sessionUser,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `session_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}${cookieSecuritySuffix()}`,
    });
    res.end(JSON.stringify(sessionUser));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    const cookies = parseCookies(req);
    const token = cookies.session_token;
    if (token) {
      sessions.delete(token);
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `session_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const user = getAuthenticatedUser(req);
    if (!user) {
      sendJson(res, 200, { authenticated: false });
      return;
    }
    sendJson(res, 200, { authenticated: true, ...user });
    return;
  }

  // 2. AUTHENTICATION SHIELD for all other API endpoints
  const user = getAuthenticatedUser(req);
  if (!user) {
    sendError(res, 401, 'Unauthorized. Please login.');
    return;
  }
  const { tenantId } = user;

  // 3. DASHBOARD API
  if (req.method === 'GET' && pathname === '/api/dashboard') {
    const todayRes = await db.query(
      'SELECT COUNT(*)::integer as count FROM bookings WHERE tenant_id = $1 AND date = CURRENT_DATE AND status != $2',
      [tenantId, 'cancelled']
    );
    const revRes = await db.query(
      "SELECT COALESCE(SUM(grand_total), 0)::numeric as total FROM invoices WHERE tenant_id = $1 AND status = 'paid' AND DATE(created_at) = CURRENT_DATE",
      [tenantId]
    );
    const custRes = await db.query(
      'SELECT COUNT(*)::integer as count FROM customers WHERE tenant_id = $1',
      [tenantId]
    );
    const lowStockRes = await db.query(
      'SELECT name, stock_quantity, reorder_level FROM inventory_items WHERE tenant_id = $1 AND stock_quantity <= reorder_level',
      [tenantId]
    );

    sendJson(res, 200, {
      todayAppointments: todayRes.rows[0].count,
      todayRevenue: parseFloat(revRes.rows[0].total),
      customers: custRes.rows[0].count,
      lowStockItems: lowStockRes.rows,
    });
    return;
  }

  // 4. COLLECTION ENDPOINTS
  const collections = ['customers', 'appointments', 'staff', 'services', 'invoices', 'payments', 'inventory'];
  const matched = collections.find((col) => pathname === `/api/${col}` || pathname.startsWith(`/api/${col}/`));

  if (!matched) {
    sendError(res, 404, 'API endpoint not found');
    return;
  }

  if (!hasPermission(user, matched, req.method)) {
    sendError(res, 403, `Forbidden. Role "${user.role}" cannot ${req.method} ${matched}.`);
    return;
  }

  // CUSTOMERS ENDPOINTS
  if (matched === 'customers') {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM customers WHERE tenant_id = $1 ORDER BY name ASC', [tenantId]);
      sendJson(res, 200, result.rows);
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      required(body, ['name', 'phone']);
      if (!isValidEmail(body.email)) {
        sendError(res, 400, 'Invalid email address.');
        return;
      }
      let countryCode;
      let phone;
      try {
        countryCode = normalizeCountryCode(body.countryCode || body.country_code || '+91');
        phone = normalizeCustomerPhone(body.phone, countryCode);
      } catch (error) {
        sendError(res, 400, error.message);
        return;
      }
      const consentStatus = body.consentStatus || body.consent_status || 'unsigned';
      const consentDate = body.consentDate || body.consent_date || null;
      const whatsappConsent = body.whatsappConsent === true || body.whatsappConsent === 'true' || body.whatsapp_consent === true || body.whatsapp_consent === 'true';
      const id = createId('customer');
      const query = `
        INSERT INTO customers (id, tenant_id, name, country_code, phone, email, notes, consent_status, consent_date, whatsapp_consent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
      `;
      const values = [
        id,
        tenantId,
        body.name,
        countryCode,
        phone,
        body.email || null,
        body.notes || null,
        consentStatus,
        consentDate,
        whatsappConsent,
      ];
      const result = await db.query(query, values);
      await insertAuditLog(db, {
        tenantId,
        userId: user.username,
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
      sendJson(res, 201, result.rows[0]);
      return;
    }
    if (req.method === 'PATCH') {
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      const updates = [];
      const values = [id, tenantId];
      let valIndex = 3;
      let existingCountryCode = null;

      if ('phone' in body && !('countryCode' in body) && !('country_code' in body)) {
        const existing = await db.query('SELECT country_code FROM customers WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        existingCountryCode = existing.rows[0]?.country_code || '+91';
      }

      for (const [key, val] of Object.entries(body)) {
        const dbKey = {
          countryCode: 'country_code',
          consentStatus: 'consent_status',
          consentDate: 'consent_date',
          whatsappConsent: 'whatsapp_consent',
        }[key] || key;
        if (dbKey === 'email' && !isValidEmail(val)) {
          sendError(res, 400, 'Invalid email address.');
          return;
        }
        if (['name', 'phone', 'country_code', 'email', 'notes', 'consent_status', 'consent_date', 'whatsapp_consent'].includes(dbKey)) {
          updates.push(`${dbKey} = $${valIndex}`);
          try {
            if (dbKey === 'country_code') {
              values.push(normalizeCountryCode(val));
            } else if (dbKey === 'phone') {
              values.push(normalizeCustomerPhone(val, body.countryCode || body.country_code || existingCountryCode || '+91'));
            } else if (dbKey === 'whatsapp_consent') {
              values.push(val === true || val === 'true');
            } else {
              values.push(val);
            }
          } catch (error) {
            sendError(res, 400, error.message);
            return;
          }
          valIndex++;
        }
      }

      if (updates.length === 0) {
        sendError(res, 400, 'No valid fields provided for update');
        return;
      }

      const query = `UPDATE customers SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`;
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        sendError(res, 404, 'Customer not found');
        return;
      }
      await insertAuditLog(db, {
        tenantId,
        userId: user.username,
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
      sendJson(res, 200, result.rows[0]);
      return;
    }
  }

  // APPOINTMENTS (BOOKINGS) ENDPOINTS
  if (matched === 'appointments') {
    if (req.method === 'GET') {
      const result = await db.query(
        `SELECT b.*, c.name as customer_name, c.phone as phone, c.whatsapp_consent as whatsapp_consent, s.name as staff_name, sv.name as service_name
         FROM bookings b
         LEFT JOIN customers c ON b.customer_id = c.id
         LEFT JOIN staff s ON b.staff_id = s.id
         LEFT JOIN services sv ON b.service_id = sv.id
         WHERE b.tenant_id = $1 ORDER BY b.date DESC, b.start_time ASC`,
        [tenantId]
      );
      sendJson(res, 200, result.rows);
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      required(body, ['customerId', 'staffId', 'chairId', 'serviceId', 'date', 'startTime', 'endTime']);

      // 1. Dual Booking Conflict Check (both chair and staff)
      const conflictQuery = `
        SELECT b.*, s.name as staff_name
        FROM bookings b
        LEFT JOIN staff s ON b.staff_id = s.id
        WHERE b.tenant_id = $1 
          AND b.date = $2 
          AND b.status != 'cancelled'
          AND (b.staff_id = $3 OR b.chair_id = $4)
      `;
      const conflictRes = await db.query(conflictQuery, [tenantId, body.date, body.staffId, body.chairId]);
      const startMin = minutesFromTime(body.startTime);
      const endMin = minutesFromTime(body.endTime);

      const conflicts = conflictRes.rows.filter((b) =>
        overlaps(minutesFromTime(b.start_time), minutesFromTime(b.end_time), startMin, endMin)
      );

      if (conflicts.length > 0) {
        const confType = conflicts[0].staff_id === body.staffId ? 'Staff member' : 'Chair/Station';
        sendError(
          res,
          409,
          `Booking conflict: ${confType} is already booked during this time slot.`,
          conflicts
        );
        return;
      }

      // Fetch service price to set default booking amount
      const svcRes = await db.query('SELECT price FROM services WHERE id = $1 AND tenant_id = $2', [
        body.serviceId,
        tenantId,
      ]);
      if (svcRes.rows.length === 0) {
        sendError(res, 400, 'Invalid service ID');
        return;
      }
      const customerRes = await db.query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [
        body.customerId,
        tenantId,
      ]);
      if (customerRes.rows.length === 0) {
        sendError(res, 400, 'Invalid customer ID');
        return;
      }
      const staffRes = await db.query('SELECT id FROM staff WHERE id = $1 AND tenant_id = $2 AND status = $3', [
        body.staffId,
        tenantId,
        'active',
      ]);
      if (staffRes.rows.length === 0) {
        sendError(res, 400, 'Invalid staff ID');
        return;
      }
      const amount = svcRes.rows[0].price;

      const id = createId('booking');
      const insertQuery = `
        INSERT INTO bookings (id, tenant_id, customer_id, staff_id, chair_id, service_id, date, start_time, end_time, status, source, amount, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *
      `;
      const values = [
        id,
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
        amount,
        body.notes || null,
      ];
      const result = await db.query(insertQuery, values);
      await insertAuditLog(db, {
        tenantId,
        userId: user.username,
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
      sendJson(res, 201, result.rows[0]);
      return;
    }
    if (req.method === 'PATCH') {
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      const updates = [];
      const values = [id, tenantId];
      let valIndex = 3;

      for (const [key, val] of Object.entries(body)) {
        if (
          ['customer_id', 'staff_id', 'chair_id', 'service_id', 'date', 'start_time', 'end_time', 'status', 'source', 'amount', 'notes'].includes(
            key
          )
        ) {
          updates.push(`${key} = $${valIndex}`);
          values.push(val);
          valIndex++;
        }
      }

      if (updates.length === 0) {
        sendError(res, 400, 'No valid fields provided for update');
        return;
      }

      const query = `UPDATE bookings SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`;
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        sendError(res, 404, 'Booking not found');
        return;
      }
      await insertAuditLog(db, {
        tenantId,
        userId: user.username,
        action: 'booking_updated',
        entityName: 'bookings',
        entityId: result.rows[0].id,
        details: { updatedFields: Object.keys(body).filter((key) => ['customer_id', 'staff_id', 'chair_id', 'service_id', 'date', 'start_time', 'end_time', 'status', 'source', 'amount', 'notes'].includes(key)) },
      });
      sendJson(res, 200, result.rows[0]);
      return;
    }
  }

  // STAFF ENDPOINTS
  if (matched === 'staff') {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM staff WHERE tenant_id = $1 ORDER BY name ASC', [tenantId]);
      sendJson(res, 200, result.rows);
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      required(body, ['name', 'phone', 'role', 'commissionType', 'commissionValue']);
      let countryCode;
      let phone;
      try {
        countryCode = normalizeCountryCode(body.countryCode || body.country_code || '+91');
        phone = normalizeCustomerPhone(body.phone, countryCode);
      } catch (error) {
        sendError(res, 400, error.message);
        return;
      }
      const commissionValue = parseFloat(body.commissionValue);
      if (!Number.isFinite(commissionValue) || commissionValue < 0 || commissionValue > 33) {
        sendError(res, 400, 'Commission value must be between 0 and 33.');
        return;
      }
      const id = createId('staff');
      const query = `
        INSERT INTO staff (id, tenant_id, name, country_code, phone, role, commission_type, commission_value, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
      `;
      const values = [
        id,
        tenantId,
        body.name,
        countryCode,
        phone,
        body.role,
        body.commissionType,
        commissionValue,
        'active',
      ];
      const result = await db.query(query, values);
      await insertAuditLog(db, {
        tenantId,
        userId: user.username,
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
      sendJson(res, 201, result.rows[0]);
      return;
    }
  }

  // SERVICES ENDPOINTS
  if (matched === 'services') {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM services WHERE tenant_id = $1 AND is_active = TRUE ORDER BY name ASC', [
        tenantId,
      ]);
      sendJson(res, 200, result.rows);
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      required(body, ['name', 'durationMinutes', 'price']);
      const id = createId('service');
      const query = `
        INSERT INTO services (id, tenant_id, name, duration_minutes, price, tax_class)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `;
      const values = [
        id,
        tenantId,
        body.name,
        parseInt(body.durationMinutes, 10),
        parseFloat(body.price),
        body.taxClass || 'exempt',
      ];
      const result = await db.query(query, values);
      await insertAuditLog(db, {
        tenantId,
        userId: user.username,
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
      sendJson(res, 201, result.rows[0]);
      return;
    }
  }

  // INVOICES ENDPOINTS
  if (matched === 'invoices') {
    if (req.method === 'GET') {
      const result = await db.query(
        `SELECT i.*, c.name as customer_name, c.phone as phone, c.whatsapp_consent as whatsapp_consent
         FROM invoices i
         LEFT JOIN customers c ON i.customer_id = c.id
         WHERE i.tenant_id = $1 ORDER BY i.created_at DESC`,
        [tenantId]
      );
      sendJson(res, 200, result.rows);
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      required(body, ['customerId', 'items']); // items: [{serviceId, quantity, unitPrice}]
      if (!Array.isArray(body.items) || body.items.length === 0 || body.items.some((item) => !item?.serviceId)) {
        sendError(res, 400, 'At least one valid service is required before generating a bill.');
        return;
      }

      const currentYear = new Date().getFullYear();

      // Calculate totals
      let subtotal = 0;
      let taxTotal = 0;
      const discountTotal = parseFloat(body.discountTotal || 0);

      const customerRes = await db.query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [
        body.customerId,
        tenantId,
      ]);
      if (customerRes.rows.length === 0) {
        sendError(res, 400, 'Invalid customer ID');
        return;
      }

      // Verify and calculate for each service item
      const itemDetails = [];
      for (const item of body.items) {
        const svcRes = await db.query('SELECT price, tax_class FROM services WHERE id = $1 AND tenant_id = $2', [
          item.serviceId,
          tenantId,
        ]);
        if (svcRes.rows.length === 0) {
          sendError(res, 400, `Invalid service ID: ${item.serviceId}`);
          return;
        }
        const unitPrice = parseFloat(item.unitPrice || svcRes.rows[0].price);
        const qty = parseInt(item.quantity || 1, 10);
        const taxClass = svcRes.rows[0].tax_class;

        let taxAmount = 0;
        if (taxClass === 'GST-18') {
          taxAmount = Number((unitPrice * qty * 0.18).toFixed(2));
        } else if (taxClass === 'GST-5') {
          taxAmount = Number((unitPrice * qty * 0.05).toFixed(2));
        }

        subtotal += unitPrice * qty;
        taxTotal += taxAmount;
        itemDetails.push({ serviceId: item.serviceId, quantity: qty, unitPrice, taxAmount });
      }

      const grandTotal = Math.max(subtotal + taxTotal - discountTotal, 0);
      const invoiceId = createId('invoice');

      // Begin Tx
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        if (body.bookingId) {
          const bookingRes = await client.query('SELECT id FROM bookings WHERE id = $1 AND tenant_id = $2', [
            body.bookingId,
            tenantId,
          ]);
          if (bookingRes.rowCount === 0) {
            await client.query('ROLLBACK');
            sendError(res, 400, 'Invalid booking ID');
            return;
          }
        }

        const sequenceRes = await client.query(
          `INSERT INTO invoice_sequences (tenant_id, invoice_year, last_number)
           VALUES ($1, $2, 1)
           ON CONFLICT (tenant_id, invoice_year)
           DO UPDATE SET last_number = invoice_sequences.last_number + 1, updated_at = CURRENT_TIMESTAMP
           RETURNING last_number`,
          [tenantId, currentYear]
        );

        const invoiceNumber = `INV-${currentYear}-${String(sequenceRes.rows[0].last_number).padStart(4, '0')}`;
        
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
          userId: user.username,
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
        
        const createdInvoice = {
          id: invoiceId,
          invoiceNumber,
          customerId: body.customerId,
          bookingId: body.bookingId || null,
          subtotal,
          taxTotal,
          discountTotal,
          grandTotal,
          status: 'draft',
        };
        sendJson(res, 201, createdInvoice);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Invoice creation transaction failed:', err);
        sendError(res, 500, 'Database transaction failed');
      } finally {
        client.release();
      }
      return;
    }
  }

  // PAYMENTS ENDPOINTS
  if (matched === 'payments') {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM payments WHERE tenant_id = $1 ORDER BY payment_date DESC', [
        tenantId,
      ]);
      sendJson(res, 200, result.rows);
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      required(body, ['invoiceId', 'amount', 'paymentMode']);

      const id = createId('payment');
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        const invRes = await client.query(
          'SELECT grand_total, status FROM invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
          [body.invoiceId, tenantId]
        );
        if (invRes.rows.length === 0) {
          await client.query('ROLLBACK');
          sendError(res, 404, 'Invoice not found');
          return;
        }

        const paymentAmount = parseFloat(body.amount);
        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
          await client.query('ROLLBACK');
          sendError(res, 400, 'Payment amount must be greater than zero.');
          return;
        }

        await client.query(
          `INSERT INTO payments (id, tenant_id, invoice_id, amount, payment_mode, reference_number)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, tenantId, body.invoiceId, paymentAmount, body.paymentMode, body.referenceNumber || null]
        );

        await insertAuditLog(client, {
          tenantId,
          userId: user.username,
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

        const totalRes = await client.query(
          'SELECT COALESCE(SUM(amount), 0)::numeric as total_paid FROM payments WHERE invoice_id = $1 AND tenant_id = $2',
          [body.invoiceId, tenantId]
        );
        const totalPaid = parseFloat(totalRes.rows[0].total_paid);
        const grandTotal = parseFloat(invRes.rows[0].grand_total);
        const nextStatus = totalPaid >= grandTotal ? 'paid' : 'partially_paid';

        await client.query(`UPDATE invoices SET status = $1 WHERE id = $2 AND tenant_id = $3`, [
          nextStatus,
          body.invoiceId,
          tenantId,
        ]);

        if (nextStatus === 'paid') {
          const bookingRes = await client.query(
            `SELECT b.id as booking_id, b.staff_id, b.amount, s.name as staff_name, s.commission_type, s.commission_value
             FROM bookings b
             JOIN staff s ON b.staff_id = s.id
             JOIN invoices i ON i.booking_id = b.id
             WHERE i.id = $1 AND b.tenant_id = $2 AND b.status = 'confirmed'`,
            [body.invoiceId, tenantId]
          );

          if (bookingRes.rows.length > 0) {
            const b = bookingRes.rows[0];
            const commission = calculateCommission(b.amount, b.commission_type, b.commission_value);

            await client.query(`UPDATE bookings SET status = 'completed' WHERE id = $1 AND tenant_id = $2`, [
              b.booking_id,
              tenantId,
            ]);

            await insertAuditLog(client, {
              tenantId,
              userId: user.username,
              action: 'booking_completed',
              entityName: 'bookings',
              entityId: b.booking_id,
              details: {
                invoiceId: body.invoiceId,
                paymentId: id,
                totalPaid,
              },
            });

            await insertAuditLog(client, {
              tenantId,
              userId: user.username,
              action: 'commission_calculation',
              entityName: 'staff',
              entityId: b.staff_id,
              details: {
                staffName: b.staff_name,
                bookingId: b.booking_id,
                invoiceId: body.invoiceId,
                commission,
              },
            });
          }
        }

        await client.query('COMMIT');
        sendJson(res, 201, {
          id,
          status: 'success',
          invoiceStatus: nextStatus,
          totalPaid,
          balanceDue: Math.max(grandTotal - totalPaid, 0),
          message: nextStatus === 'paid' ? 'Payment recorded and invoice marked as paid.' : 'Payment recorded as a partial payment.',
        });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Payment transaction failed:', err);
        sendError(res, 500, 'Database transaction failed');
      } finally {
        client.release();
      }
      return;
    }
  }

  // INVENTORY ENDPOINTS
  if (matched === 'inventory') {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM inventory_items WHERE tenant_id = $1 ORDER BY name ASC', [
        tenantId,
      ]);
      sendJson(res, 200, result.rows);
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      required(body, ['name', 'type', 'stockQuantity']);
      const id = createId('inventory');
      const query = `
        INSERT INTO inventory_items (id, tenant_id, name, type, stock_quantity, reorder_level, vendor_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `;
      const values = [
        id,
        tenantId,
        body.name,
        body.type,
        parseInt(body.stockQuantity, 10),
        parseInt(body.reorderLevel || 5, 10),
        body.vendorName || null,
      ];
      const result = await db.query(query, values);
      await insertAuditLog(db, {
        tenantId,
        userId: user.username,
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
      sendJson(res, 201, result.rows[0]);
      return;
    }
    if (req.method === 'PATCH') {
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      const updates = [];
      const values = [id, tenantId];
      let valIndex = 3;

      for (const [key, val] of Object.entries(body)) {
        if (['name', 'type', 'stock_quantity', 'reorder_level', 'vendor_name'].includes(key)) {
          updates.push(`${key} = $${valIndex}`);
          values.push(key === 'stock_quantity' || key === 'reorder_level' ? parseInt(val, 10) : val);
          valIndex++;
        }
      }

      if (updates.length === 0) {
        sendError(res, 400, 'No valid fields provided for update');
        return;
      }

      const query = `UPDATE inventory_items SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *`;
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        sendError(res, 404, 'Inventory item not found');
        return;
      }
      sendJson(res, 200, result.rows[0]);
      return;
    }
  }

  sendError(res, 405, 'Method not allowed');
}

export async function handleRequest(req, res) {
  try {
    if (req.url.startsWith('/api/')) {
      await handleApi(req, res);
    } else {
      await serveStatic(req, res);
    }
  } catch (error) {
    console.error('Unhandled request error:', error);
    if (error instanceof SyntaxError) {
      sendError(res, 400, 'Invalid JSON body');
      return;
    }
    sendError(res, error.status || 500, error.message || 'Internal server error', error.details);
  }
}

export async function createApp(options = {}) {
  // DB init
  await db.initDb();

  const server = createServer(handleRequest);

  return {
    listen(port = process.env.PORT || 3000) {
      return new Promise((resolve) => {
        server.listen(port, () => resolve(server));
      });
    },
    close() {
      return new Promise((resolve) => {
        server.close(resolve);
      });
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await createApp();
  const server = await app.listen();
  const { port } = server.address();
  console.log(`SooryasWeb running at http://localhost:${port}`);
}
