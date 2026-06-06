import crypto from 'node:crypto';

export function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '');
}

export function normalizeCountryCode(countryCode = '+91') {
  const value = String(countryCode || '+91').trim();
  const withPlus = value.startsWith('+') ? value : `+${value}`;
  if (!/^\+\d{1,3}$/.test(withPlus)) {
    throw new Error('Invalid country code. Use + followed by 1 to 3 digits.');
  }
  return withPlus;
}

export function normalizeCustomerPhone(phone = '', countryCode = '+91') {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const countryDigits = normalizedCountryCode.slice(1);
  const raw = String(phone || '').trim();
  const phoneDigits = raw.replace(/\D/g, '');

  if (!phoneDigits) {
    throw new Error('Phone number is required.');
  }

  const fullDigits = raw.startsWith('+') && phoneDigits.startsWith(countryDigits)
    ? phoneDigits
    : phoneDigits.startsWith(countryDigits) && phoneDigits.length > 10
      ? phoneDigits
      : `${countryDigits}${phoneDigits}`;
  const nationalDigits = fullDigits.startsWith(countryDigits) ? fullDigits.slice(countryDigits.length) : phoneDigits;

  if (normalizedCountryCode === '+91' && nationalDigits.length !== 10) {
    throw new Error('Indian phone numbers must have 10 digits.');
  }
  if (normalizedCountryCode !== '+91' && (nationalDigits.length < 6 || nationalDigits.length > 12)) {
    throw new Error('Phone number must have 6 to 12 local digits for the selected country code.');
  }
  if (fullDigits.length < 8 || fullDigits.length > 15) {
    throw new Error('Phone number must be valid for WhatsApp/E.164 format.');
  }

  return `+${fullDigits}`;
}

export function isValidEmail(email) {
  if (email === undefined || email === null || email === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function minutesFromTime(value) {
  const [hours, minutes] = String(value).split(':').map(Number);
  return hours * 60 + minutes;
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Password hashing using native Node.js crypto (PBKDF2)
export function hashPassword(password, salt = 'salt') {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password, hash, salt = 'salt') {
  return hashPassword(password, salt) === hash;
}

// Parlour Staff Commission Calculation
export function calculateCommission(servicePrice, commissionType, commissionValue) {
  const price = Number(servicePrice || 0);
  const val = Number(commissionValue || 0);
  
  if (commissionType === 'percentage') {
    return Number((price * (val / 100)).toFixed(2));
  }
  if (commissionType === 'fixed') {
    return val;
  }
  return 0;
}
