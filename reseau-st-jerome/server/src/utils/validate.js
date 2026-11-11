import { HttpError } from './errors.js';

export const normId = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export function cleanText(value, { max, field, min = 0 }) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (min > 0 && s.length < min) {
    throw new HttpError(400, `${field} est obligatoire (${min} caractères minimum).`);
  }
  if (s.length > max) throw new HttpError(400, `${field} ne doit pas dépasser ${max} caractères.`);
  return s;
}

export function checkPassword(p) {
  if (typeof p !== 'string' || p.length < 8) {
    throw new HttpError(400, 'Le mot de passe doit contenir au moins 8 caractères.');
  }
  if (p.length > 72) throw new HttpError(400, 'Le mot de passe ne doit pas dépasser 72 caractères.');
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
    throw new HttpError(400, 'Le mot de passe doit contenir au moins une lettre et un chiffre.');
  }
}

export function parseId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'Identifiant invalide.');
  return n;
}
