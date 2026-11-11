import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { HttpError, ah } from '../utils/errors.js';
import { normId, checkPassword } from '../utils/validate.js';
import { issueCode, checkCode } from '../utils/verification.js';
import { privateUser } from '../utils/mappers.js';
import { setSession, clearSession, requireAuth } from '../middleware/auth.js';

const router = Router();

// Limite stricte sur les routes sensibles : 40 essais par 15 minutes et par adresse IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

// Empreinte factice : on fait le même calcul même si l’utilisateur n’existe pas (évite de révéler quels comptes existent).
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice-1', 12);

const NOT_ALLOWED =
  'Cette adresse e-mail ou ce matricule n’est pas autorisé. Si vous êtes étudiant à Saint Jérôme, contactez l’administration.';
const ALREADY_REGISTERED =
  'Un compte existe déjà pour cet étudiant. Connectez-vous, ou réinitialisez votre mot de passe.';

async function findAllowed(identifier) {
  const { rows } = await query(
    'SELECT * FROM allowed_students WHERE lower(institutional_email) = $1 OR lower(matricule) = $1',
    [identifier]
  );
  return rows[0] || null;
}

const hasAccount = async (allowedId) =>
  (await query('SELECT 1 FROM users WHERE allowed_student_id = $1', [allowedId])).rowCount > 0;

const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
};

// ÉTAPE 1 de l'inscription : vérifier que l'étudiant figure sur la liste puis envoyer un code.
router.post(
  '/register/start',
  authLimiter,
  ah(async (req, res) => {
    const id = normId(req.body?.identifier);
    if (!id) throw new HttpError(400, 'Saisissez votre e-mail institutionnel ou votre matricule.');
    const allowed = await findAllowed(id);
    if (!allowed) throw new HttpError(403, NOT_ALLOWED);
    if (await hasAccount(allowed.id)) throw new HttpError(409, ALREADY_REGISTERED);
    await issueCode(allowed.institutional_email, 'register');
    res.json({ message: `Un code de vérification a été envoyé à ${maskEmail(allowed.institutional_email)}.` });
  })
);

// ÉTAPE 2 : contrôler le code, créer le mot de passe et ouvrir la session.
router.post(
  '/register/complete',
  authLimiter,
  ah(async (req, res) => {
    const id = normId(req.body?.identifier);
    const { code, password, acceptTerms } = req.body || {};
    if (acceptTerms !== true) throw new HttpError(400, 'Vous devez accepter les conditions d’utilisation.');
    checkPassword(password);
    const allowed = await findAllowed(id);
    if (!allowed) throw new HttpError(403, NOT_ALLOWED);
    if (await hasAccount(allowed.id)) throw new HttpError(409, ALREADY_REGISTERED);

    await checkCode(allowed.institutional_email, 'register', String(code ?? '').trim());

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
      const { rows } = await query(
        `INSERT INTO users (allowed_student_id, email, matricule, password_hash, display_name, filiere, niveau, terms_accepted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING *`,
        [allowed.id, allowed.institutional_email, allowed.matricule, passwordHash, allowed.full_name, allowed.filiere, allowed.niveau]
      );
      user = rows[0];
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, ALREADY_REGISTERED); // doublon (double clic)
      throw err;
    }
    setSession(res, user.id);
    res.status(201).json({ user: privateUser(user) });
  })
);

router.post(
  '/login',
  authLimiter,
  ah(async (req, res) => {
    const id = normId(req.body?.identifier);
    const password = req.body?.password;
    if (!id || typeof password !== 'string' || !password) {
      throw new HttpError(400, 'Saisissez votre identifiant et votre mot de passe.');
    }
    if (password.length > 128) throw new HttpError(401, 'Identifiant ou mot de passe incorrect.');

    const { rows } = await query('SELECT * FROM users WHERE lower(email) = $1 OR lower(matricule) = $1', [id]);
    const user = rows[0];

    if (user?.locked_until && user.locked_until > new Date()) {
      throw new HttpError(429, 'Compte temporairement bloqué après plusieurs échecs. Réessayez dans 15 minutes.');
    }

    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) {
      if (user) {
        const attempts = user.failed_attempts + 1;
        if (attempts >= 5) {
          await query(
            `UPDATE users SET failed_attempts = 0, locked_until = now() + interval '15 minutes' WHERE id = $1`,
            [user.id]
          );
        } else {
          await query('UPDATE users SET failed_attempts = $2 WHERE id = $1', [user.id, attempts]);
        }
      }
      throw new HttpError(401, 'Identifiant ou mot de passe incorrect.');
    }
    if (user.status === 'suspended') throw new HttpError(403, 'Ce compte est suspendu. Contactez un modérateur.');

    await query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);
    setSession(res, user.id);
    res.json({ user: privateUser(user) });
  })
);

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: privateUser(req.user) }));

// Mot de passe oublié : la réponse est toujours la même, que le compte existe ou non.
router.post(
  '/forgot',
  authLimiter,
  ah(async (req, res) => {
    const id = normId(req.body?.identifier);
    if (!id) throw new HttpError(400, 'Saisissez votre e-mail institutionnel ou votre matricule.');
    const { rows } = await query('SELECT email FROM users WHERE lower(email) = $1 OR lower(matricule) = $1', [id]);
    if (rows[0]) {
      try {
        await issueCode(rows[0].email, 'reset');
      } catch (err) {
        if (!(err instanceof HttpError)) throw err; // le délai d’une minute n’est pas révélé
      }
    }
    res.json({ message: 'Si un compte correspond, un code a été envoyé à l’adresse institutionnelle associée.' });
  })
);

router.post(
  '/reset',
  authLimiter,
  ah(async (req, res) => {
    const id = normId(req.body?.identifier);
    const { code, newPassword } = req.body || {};
    checkPassword(newPassword);
    const { rows } = await query('SELECT id, email FROM users WHERE lower(email) = $1 OR lower(matricule) = $1', [id]);
    const user = rows[0];
    if (!user) throw new HttpError(400, 'Code expiré ou introuvable. Demandez un nouveau code.');
    await checkCode(user.email, 'reset', String(code ?? '').trim());
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $2, failed_attempts = 0, locked_until = NULL WHERE id = $1', [
      user.id,
      hash,
    ]);
    res.json({ message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
  })
);

export default router;
