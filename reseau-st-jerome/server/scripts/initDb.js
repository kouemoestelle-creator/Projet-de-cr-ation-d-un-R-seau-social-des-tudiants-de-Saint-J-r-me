import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = await fs.readFile(path.join(dir, '../db/schema.sql'), 'utf8');

try {
  await pool.query(sql);
  console.log('Base de données initialisée : les tables sont prêtes.');
} catch (err) {
  console.error('Échec de l’initialisation :', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
