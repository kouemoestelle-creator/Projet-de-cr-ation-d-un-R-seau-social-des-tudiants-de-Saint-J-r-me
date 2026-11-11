import 'dotenv/config';
import path from 'node:path';

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable d’environnement manquante : ${name} (voir server/.env.example)`);
    process.exit(1);
  }
  return value;
}

const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  console.error('JWT_SECRET doit contenir au moins 32 caractères.');
  process.exit(1);
}
if (isProd && !process.env.SMTP_HOST) {
  console.error('En production, SMTP_HOST est obligatoire (envoi des codes par e-mail).');
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProd,
  jwtSecret,
  databaseUrl: required('DATABASE_URL'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Réseau Saint Jérôme <no-reply@example.com>',
  },
};
