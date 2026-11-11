// Importe la liste des étudiants autorisés depuis un fichier CSV.
// Usage : npm run db:seed            (utilise data/students.csv, sinon data/students.sample.csv)
//         npm run db:seed -- chemin/vers/liste.csv
// Format : matricule,email,nom,filiere,niveau   (première ligne = en-têtes, pas de virgule dans les valeurs)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

async function pickFile() {
  if (process.argv[2]) return path.resolve(process.argv[2]);
  const real = path.join(dir, '../data/students.csv');
  try {
    await fs.access(real);
    return real;
  } catch {
    return path.join(dir, '../data/students.sample.csv');
  }
}

try {
  const file = await pickFile();
  const lines = (await fs.readFile(file, 'utf8')).split(/\r?\n/).filter((l) => l.trim());
  lines.shift(); // en-têtes
  let count = 0;
  for (const line of lines) {
    const [matricule, email, nom, filiere = '', niveau = ''] = line.split(',').map((s) => s.trim());
    if (!matricule || !email || !nom) {
      console.warn('Ligne ignorée (incomplète) :', line);
      continue;
    }
    await pool.query(
      `INSERT INTO allowed_students (matricule, institutional_email, full_name, filiere, niveau)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (matricule) DO UPDATE
         SET institutional_email = EXCLUDED.institutional_email, full_name = EXCLUDED.full_name,
             filiere = EXCLUDED.filiere, niveau = EXCLUDED.niveau`,
      [matricule, email.toLowerCase(), nom, filiere || null, niveau || null]
    );
    count += 1;
  }
  console.log(`${count} étudiant(s) importé(s) depuis ${path.basename(file)}.`);
} catch (err) {
  console.error('Échec de l’import :', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
