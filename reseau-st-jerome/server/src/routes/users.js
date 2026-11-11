import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, ah } from '../utils/errors.js';
import { cleanText, parseId } from '../utils/validate.js';
import { publicUser, privateUser } from '../utils/mappers.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage, saveImage, removeImage } from '../middleware/upload.js';

const router = Router();
router.use(requireAuth);

// Modifier mon profil (F5)
router.patch(
  '/me',
  ah(async (req, res) => {
    const displayName = cleanText(req.body?.displayName, { max: 80, min: 2, field: 'Le nom' });
    const filiere = cleanText(req.body?.filiere, { max: 80, field: 'La filière' });
    const niveau = cleanText(req.body?.niveau, { max: 40, field: 'Le niveau' });
    const bio = cleanText(req.body?.bio, { max: 300, field: 'La biographie' });
    const { rows } = await query(
      'UPDATE users SET display_name = $2, filiere = $3, niveau = $4, bio = $5 WHERE id = $1 RETURNING *',
      [req.user.id, displayName, filiere || null, niveau || null, bio]
    );
    res.json({ user: privateUser(rows[0]) });
  })
);

// Photo de profil
router.post(
  '/me/photo',
  uploadImage('photo'),
  ah(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choisissez une image.');
    const name = await saveImage(req.file);
    const old = req.user.photo_path;
    const { rows } = await query('UPDATE users SET photo_path = $2 WHERE id = $1 RETURNING *', [req.user.id, name]);
    await removeImage(old);
    res.json({ user: privateUser(rows[0]) });
  })
);

// Voir le profil d'un étudiant
// Rechercher des étudiants
router.get('/', ah(async (req, res) => {
  const search = cleanText(req.query.search, {
    max: 80,
    field: 'Recherche'
  });

  const { rows } = await query(
    `SELECT id, display_name, photo_path, filiere, niveau
     FROM users
     WHERE status = 'active'
       AND id <> $1
       AND display_name ILIKE $2
     ORDER BY display_name ASC
     LIMIT 20`,
    [req.user.id, `%${search}%`]
  );

  res.json({ users: rows });
}));
router.get(
  '/:id',
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await query(`SELECT * FROM users WHERE id = $1 AND status = 'active'`, [id]);
    if (!rows[0]) throw new HttpError(404, 'Profil introuvable.');
    const count = await query(`SELECT count(*)::int AS n FROM posts WHERE author_id = $1 AND status = 'visible'`, [id]);
    res.json({ user: publicUser(rows[0]), postCount: count.rows[0].n });
  })
);

export default router;
