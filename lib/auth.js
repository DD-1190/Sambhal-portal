import crypto from 'node:crypto';

export const COOKIE = 'sambhal_session';
const secret = () => process.env.SESSION_SECRET || '';

export function makeToken(days = 14) {
  const exp = Date.now() + days * 86400000;
  const sig = crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex');
  return `${exp}.${sig}`;
}

export function passwordOk(input) {
  const real = (process.env.ADMIN_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
  if (!real || !input) return false;
  const a = crypto.createHash('sha256').update(String(input).trim()).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}
