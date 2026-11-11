import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError, ah } from '../utils/errors.js';

export const COOKIE = 'sj_token';
const SESSION_HOURS = 12;

export function setSession(res, userId) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: `${SESSION_HOURS}h`,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true, // illisible par le JavaScript de la page (protège contre le vol par XSS)
    sameSite: 'lax', // protège contre les requêtes envoyées depuis un autre site (CSRF)
    secure: config.isProd, // HTTPS obligatoire en production
    maxAge: SESSION_HOURS * 3600 * 1000,
    path: '/',
  });
}

export const clearSession = (res) => res.clearCookie(COOKIE, { path: '/' });

export const requireAuth = ah(async (req, res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new HttpError(401, 'Veuillez vous connecter.');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Session expirée. Veuillez vous reconnecter.');
  }
  // On relit l’utilisateur à chaque requête : un compte suspendu perd l’accès immédiatement.
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.sub]);
  const user = rows[0];
  if (!user) throw new HttpError(401, 'Session invalide. Veuillez vous reconnecter.');
  if (user.status === 'suspended') throw new HttpError(403, 'Ce compte est suspendu.');
  req.user = user;
  next();
});

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role) ? next() : next(new HttpError(403, 'Action non autorisée.'));
