import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, ah } from '../utils/errors.js';
import { cleanText, parseId } from '../utils/validate.js';
import { POST_SELECT, mapPost } from '../utils/mappers.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage, saveImage, removeImage } from '../middleware/upload.js';
import { sendNotificationToUser } from '../notificationStream.js';

const router = Router();
router.use(requireAuth);

const MAX_BODY = 2000;

// Fil d'actualité chronologique, du plus récent au plus ancien (F9).
// ?before=<id du dernier post reçu> pour charger la suite ; ?author=<id> pour les publications d'un étudiant.
router.get(
  '/',
  ah(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const before = req.query.before ? parseId(req.query.before) : null;
    const author = req.query.author ? parseId(req.query.author) : null;

    const { rows } = await query(
      `${POST_SELECT}
WHERE p.status = 'visible' AND u.status = 'active'
AND ($2::int IS NULL OR p.id < $2)
AND ($3::int IS NULL OR p.author_id = $3)
ORDER BY p.id DESC
LIMIT $4`,
     [req.user.id, before, author, limit + 1]
    );
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    res.json({ posts: page.map(mapPost), nextCursor: hasMore ? page[page.length - 1].id : null });
  })
);
// Récupérer une publication précise
router.get('/:id', ah(async (req, res) => {
  const id = parseId(req.params.id);

  const { rows } = await query(
    `${POST_SELECT}
     WHERE p.id = $2
       AND p.status = 'visible'
       AND u.status = 'active'`,
    [req.user.id, id]
  );

  if (rows.length === 0) {
    throw new HttpError(404, 'Publication introuvable.');
  }

  res.json({ post: mapPost(rows[0]) });
}));
// Créer une publication : texte et/ou image (F8)
router.post(
  '/',
  uploadImage('image'),
  ah(async (req, res) => {
    const body = cleanText(req.body?.body, {
      max: MAX_BODY,
      field: 'Le texte'
    });

    if (!body && !req.file) {
      throw new HttpError(
        400,
        'Écrivez un texte ou ajoutez une image.'
      );
    }

    const image = req.file ? await saveImage(req.file) : null;

    const { rows } = await query(
      'INSERT INTO posts (author_id, body, image_path) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, body, image]
    );

    const full = await query(
      `${POST_SELECT} WHERE p.id = $2`,
      [req.user.id, rows[0].id]
    );

    res.status(201).json({
      post: mapPost(full.rows[0])
    });
  })
);

// Modifier le texte de sa propre publication
router.patch(
  '/:id',
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await query(`SELECT * FROM posts WHERE id = $1 AND status = 'visible'`, [id]);
    const post = rows[0];
    if (!post) throw new HttpError(404, 'Publication introuvable.');
    if (post.author_id !== req.user.id) throw new HttpError(403, 'Vous ne pouvez modifier que vos publications.');
    const body = cleanText(req.body?.body, { max: MAX_BODY, field: 'Le texte' });
    if (!body && !post.image_path) throw new HttpError(400, 'Une publication ne peut pas être vide.');
    await query('UPDATE posts SET body = $2, updated_at = now() WHERE id = $1', [id, body]);
   const full = await query(`${POST_SELECT} WHERE p.id = $2`, [req.user.id, id]);
  })
);

// Supprimer : l'auteur, ou un modérateur / administrateur
router.delete(
  '/:id',
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const { rows } = await query('SELECT * FROM posts WHERE id = $1', [id]);
    const post = rows[0];
    if (!post) throw new HttpError(404, 'Publication introuvable.');
    const privileged = ['moderator', 'admin'].includes(req.user.role);
    if (post.author_id !== req.user.id && !privileged) {
      throw new HttpError(403, 'Vous ne pouvez supprimer que vos publications.');
    }
    await query('DELETE FROM posts WHERE id = $1', [id]);
    await removeImage(post.image_path);
    res.json({ ok: true });
  })
);

export default router;
// Ajouter un J'aime
router.post('/:id/like', ah(async (req, res) => {
  const id = parseId(req.params.id);

  const post = await query(
  "SELECT id, author_id FROM posts WHERE id = $1 AND status = 'visible'",
  [id]
);

  if (!post.rows[0]) {
    throw new HttpError(404, 'Publication introuvable.');
  }

  const liked = await query(
  `INSERT INTO post_likes (post_id, user_id)
   VALUES ($1, $2)
   ON CONFLICT (post_id, user_id) DO NOTHING
   RETURNING post_id`,
  [id, req.user.id]
);

if (liked.rows.length > 0 && Number(post.rows[0].author_id) !== Number(req.user.id)) {
  await query(
    `INSERT INTO notifications (recipient_id, actor_id, type, post_id)
     VALUES ($1, $2, 'like', $3)`,
    [post.rows[0].author_id, req.user.id, id]
  );

  sendNotificationToUser(post.rows[0].author_id, {
    type: 'like',
    postId: id,
    actorId: req.user.id
  });
}
  const count = await query(
    'SELECT COUNT(*)::int AS n FROM post_likes WHERE post_id = $1',
    [id]
  );

  res.json({ liked: true, likeCount: count.rows[0].n });
}));

// Retirer un J'aime
router.delete('/:id/like', ah(async (req, res) => {
  const id = parseId(req.params.id);

  await query(
    'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  const count = await query(
    'SELECT COUNT(*)::int AS n FROM post_likes WHERE post_id = $1',
    [id]
  );

  res.json({ liked: false, likeCount: count.rows[0].n });
}));

// Lire les commentaires d'une publication
router.get('/:id/comments', ah(async (req, res) => {
  const id = parseId(req.params.id);

  const post = await query(
  "SELECT id, author_id FROM posts WHERE id = $1 AND status = 'visible'",
  [id]
);

  if (!post.rows[0]) {
    throw new HttpError(404, 'Publication introuvable.');
  }

  const { rows } = await query(
    `SELECT c.id, c.body, c.created_at,
            u.id AS author_id,
            u.display_name AS author_name,
            u.photo_path AS author_photo
     FROM post_comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.post_id = $1 AND u.status = 'active'
     ORDER BY c.created_at ASC`,
    [id]
  );

  res.json({
    comments: rows.map(c => ({
      id: c.id,
      body: c.body,
      createdAt: c.created_at,
      author: {
        id: c.author_id,
        displayName: c.author_name,
        photoUrl: c.author_photo
          ? `/uploads/${c.author_photo}`
          : null
      }
    }))
  });
}));

// Ajouter un commentaire
router.post('/:id/comments', ah(async (req, res) => {
  const id = parseId(req.params.id);

  const body = cleanText(req.body?.body, {
    min: 1,
    max: 1000,
    field: 'Le commentaire'
  });

  const post = await query(
  "SELECT id, author_id FROM posts WHERE id = $1 AND status = 'visible'",
  [id]
  );

  if (!post.rows[0]) {
    throw new HttpError(404, 'Publication introuvable.');
  }

  const { rows } = await query(
    `INSERT INTO post_comments (post_id, author_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, body, created_at`,
    [id, req.user.id, body]
  );
  if (Number(post.rows[0].author_id) !== Number(req.user.id)) {
  await query(
    `INSERT INTO notifications (recipient_id, actor_id, type, post_id)
     VALUES ($1, $2, 'comment', $3)`,
    [post.rows[0].author_id, req.user.id, id]
  );

  sendNotificationToUser(post.rows[0].author_id, {
    type: 'comment',
    postId: id,
    actorId: req.user.id
  });
}

  const author = await query(
    'SELECT id, display_name, photo_path FROM users WHERE id = $1',
    [req.user.id]
  );

  const count = await query(
    'SELECT COUNT(*)::int AS n FROM post_comments WHERE post_id = $1',
    [id]
  );

  res.status(201).json({
    comment: {
      id: rows[0].id,
      body: rows[0].body,
      createdAt: rows[0].created_at,
      author: {
        id: author.rows[0].id,
        displayName: author.rows[0].display_name,
        photoUrl: author.rows[0].photo_path
          ? `/uploads/${author.rows[0].photo_path}`
          : null
      }
    },
    commentCount: count.rows[0].n
  });
}));