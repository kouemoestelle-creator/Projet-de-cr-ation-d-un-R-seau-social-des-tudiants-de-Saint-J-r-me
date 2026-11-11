import { query } from '../db.js';
import { sendMail } from '../mailer.js';
import { HttpError } from './errors.js';
import { generateCode, hashCode, safeEqual } from './codes.js';

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_DELAY_MS = 60_000;

const SUBJECTS = {
  register: 'Votre code de vérification — Réseau Saint Jérôme',
  reset: 'Réinitialisation de votre mot de passe — Réseau Saint Jérôme',
};

export async function issueCode(email, purpose) {
  const last = await query(
    `SELECT created_at FROM verification_codes WHERE email = $1 AND purpose = $2 ORDER BY created_at DESC LIMIT 1`,
    [email, purpose]
  );
  if (last.rows[0] && Date.now() - last.rows[0].created_at.getTime() < RESEND_DELAY_MS) {
    throw new HttpError(429, 'Veuillez attendre une minute avant de demander un nouveau code.');
  }
  await query(`UPDATE verification_codes SET used = true WHERE email = $1 AND purpose = $2 AND used = false`, [
    email,
    purpose,
  ]);
  const code = generateCode();
  await query(
    `INSERT INTO verification_codes (email, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
    [email, purpose, hashCode(email, code), CODE_TTL_MINUTES]
  );
  await sendMail({
    to: email,
    subject: SUBJECTS[purpose],
    text:
      `Bonjour,\n\nVotre code est : ${code}\nIl est valable ${CODE_TTL_MINUTES} minutes.\n\n` +
      `Si vous n’êtes pas à l’origine de cette demande, ignorez simplement ce message.`,
  });
}

export async function checkCode(email, purpose, code) {
  const { rows } = await query(
    `SELECT * FROM verification_codes WHERE email = $1 AND purpose = $2 AND used = false
     ORDER BY created_at DESC LIMIT 1`,
    [email, purpose]
  );
  const row = rows[0];
  if (!row || row.expires_at < new Date()) {
    throw new HttpError(400, 'Code expiré ou introuvable. Demandez un nouveau code.');
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new HttpError(429, 'Trop d’essais incorrects. Demandez un nouveau code.');
  }
  if (typeof code !== 'string' || !safeEqual(row.code_hash, hashCode(email, code))) {
    await query('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    throw new HttpError(400, 'Code incorrect.');
  }
  await query('UPDATE verification_codes SET used = true WHERE id = $1', [row.id]);
}
