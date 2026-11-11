import nodemailer from 'nodemailer';
import { config } from './config.js';

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export async function sendMail({ to, subject, text }) {
  if (!transporter) {
    // Mode développement : pas de serveur d’e-mails, on affiche le message dans la console.
    console.log(`\n[E-MAIL DE TEST]\nÀ : ${to}\nObjet : ${subject}\n${text}\n`);
    return;
  }
  await transporter.sendMail({ from: config.smtp.from, to, subject, text });
}
