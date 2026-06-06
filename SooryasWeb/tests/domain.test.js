import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCommission,
  createId,
  hashPassword,
  isValidEmail,
  minutesFromTime,
  normalizeCountryCode,
  normalizeCustomerPhone,
  normalizePhone,
  overlaps,
  todayIso,
  verifyPassword,
} from '../src/domain.js';

test('normalizePhone produces India-friendly phone keys', () => {
  assert.equal(normalizePhone('+91 98470 12345'), '919847012345');
  assert.equal(normalizePhone('98470-12345'), '9847012345');
});

test('normalizeCountryCode and normalizeCustomerPhone produce WhatsApp-ready phone numbers', () => {
  assert.equal(normalizeCountryCode('91'), '+91');
  assert.equal(normalizeCountryCode('+971'), '+971');
  assert.equal(normalizeCustomerPhone('98470 11111'), '+919847011111');
  assert.equal(normalizeCustomerPhone('+91 98470 11111', '+91'), '+919847011111');
  assert.equal(normalizeCustomerPhone('501234567', '+971'), '+971501234567');
  assert.throws(() => normalizeCountryCode('abcd'), /Invalid country code/);
  assert.throws(() => normalizeCustomerPhone('12345', '+91'), /Indian phone numbers must have 10 digits/);
});

test('isValidEmail accepts optional well-formed email addresses only', () => {
  assert.equal(isValidEmail(''), true);
  assert.equal(isValidEmail(undefined), true);
  assert.equal(isValidEmail('meera@example.com'), true);
  assert.equal(isValidEmail('bad-email'), false);
});

test('todayIso returns standard YYYY-MM-DD date string', () => {
  const now = new Date('2026-06-04T12:00:00Z');
  assert.equal(todayIso(now), '2026-06-04');
});

test('createId generates valid prefixed random strings', () => {
  const id1 = createId('booking');
  const id2 = createId('booking');
  assert.ok(id1.startsWith('booking-'));
  assert.ok(id2.startsWith('booking-'));
  assert.notEqual(id1, id2);
});

test('minutesFromTime parses HH:MM into minutes', () => {
  assert.equal(minutesFromTime('10:00'), 600);
  assert.equal(minutesFromTime('11:30'), 690);
});

test('overlaps checks if time periods cross', () => {
  assert.ok(overlaps(600, 660, 630, 690)); // 10:00-11:00 overlaps 10:30-11:30
  assert.ok(!overlaps(600, 660, 660, 720)); // 10:00-11:00 does not overlap 11:00-12:00
});

test('hashPassword and verifyPassword work correctly', () => {
  const pass = 'secret123';
  const salt = 'testsalt';
  const hash = hashPassword(pass, salt);
  
  assert.ok(verifyPassword(pass, hash, salt));
  assert.ok(!verifyPassword('wrongpassword', hash, salt));
});

test('calculateCommission calculates percentage and fixed rates', () => {
  // Percentage commission: 15% on 1800
  assert.equal(calculateCommission(1800, 'percentage', 15), 270);
  
  // Fixed commission: 200 on any service
  assert.equal(calculateCommission(1200, 'fixed', 200), 200);
  
  // Invalid or unknown type
  assert.equal(calculateCommission(1200, 'unknown', 50), 0);
});
