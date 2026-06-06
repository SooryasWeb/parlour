import { pbkdf2Sync, randomUUID, timingSafeEqual } from 'node:crypto';

export function createId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function normalizePhone(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
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

export function isValidEmail(email?: string | null) {
  if (email === undefined || email === null || email === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export function verifyPassword(password: string, storedHash: string) {
  const hash = pbkdf2Sync(password, 'salt', 100000, 64, 'sha512').toString('hex');
  const hashBytes = Buffer.from(hash, 'hex');
  const storedBytes = Buffer.from(storedHash, 'hex');
  return hashBytes.length === storedBytes.length && timingSafeEqual(hashBytes, storedBytes);
}

export function calculateCommission(amount: number, type: string, value: number) {
  if (type === 'percentage') return Number((amount * (value / 100)).toFixed(2));
  return Number(value || 0);
}
