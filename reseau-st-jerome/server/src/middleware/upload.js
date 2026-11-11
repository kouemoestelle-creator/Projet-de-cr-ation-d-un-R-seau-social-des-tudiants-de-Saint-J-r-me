import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { HttpError } from '../utils/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6 }, // 5 Mo maximum
  fileFilter: (req, file, cb) =>
    ['image/jpeg', 'image/png'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new HttpError(400, 'Format non accepté : JPEG ou PNG uniquement.')),
});

export const uploadImage = (field) => upload.single(field);

// On ne fait pas confiance au type annoncé par le navigateur : on vérifie les premiers octets du fichier.
function detectExtension(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length > 12 && buf.subarray(0, 8).equals(png)) return '.png';
  return null;
}

export async function saveImage(file) {
  const ext = detectExtension(file.buffer);
  if (!ext) throw new HttpError(400, 'Le fichier n’est pas une image valide.');
  await fs.mkdir(config.uploadDir, { recursive: true });
  const name = crypto.randomBytes(16).toString('hex') + ext; // nom aléatoire : jamais celui de l’utilisateur
  await fs.writeFile(path.join(config.uploadDir, name), file.buffer, { flag: 'wx' });
  return name;
}

export async function removeImage(name) {
  if (!name || !/^[a-f0-9]{32}\.(jpg|png)$/.test(name)) return;
  await fs.unlink(path.join(config.uploadDir, name)).catch(() => {});
}
