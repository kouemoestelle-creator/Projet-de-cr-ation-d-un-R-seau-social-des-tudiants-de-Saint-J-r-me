import crypto from 'node:crypto';
import { config } from '../config.js';

export const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

// Le code n’est jamais stocké en clair : on garde son empreinte (HMAC) liée à l’adresse e-mail.
export const hashCode = (email, code) =>
  crypto.createHmac('sha256', config.jwtSecret).update(`${email}:${code}`).digest('hex');

export function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
