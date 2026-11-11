import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendNotificationToUser } from '../notificationStream.js';

const router = Router();

router.use(requireAuth);

// Afficher les conversations
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (other_user.id)
        other_user.id AS user_id,
        other_user.display_name,
        other_user.photo_path,
        m.id AS message_id,
        m.body,
        m.created_at,
        m.sender_id
       FROM messages m
       JOIN users other_user
         ON other_user.id =
         CASE
           WHEN m.sender_id = $1 THEN m.recipient_id
           ELSE m.sender_id
         END
       WHERE (m.sender_id = $1 OR m.recipient_id = $1)
         AND other_user.status = 'active'
       ORDER BY other_user.id, m.created_at DESC`,
      [req.user.id]
    );

    res.json({ conversations: rows });
  } catch (error) {
    next(error);
  }
});
// Afficher les messages d'une conversation
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0 || userId === req.user.id) {
      return res.status(400).json({ error: 'Utilisateur invalide.' });
    }

    const { rows } = await query(
      `SELECT id, sender_id, recipient_id, body, created_at, read_at
       FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC, id ASC`,
      [req.user.id, userId]
    );

    res.json({ messages: rows });
  } catch (error) {
    next(error);
  }
});
// Envoyer un message privé
router.post('/', async (req, res, next) => {
  try {
    const recipientId = Number(req.body.recipientId);
    const body = typeof req.body.body === 'string'
      ? req.body.body.trim()
      : '';

    if (
      !Number.isInteger(recipientId) ||
      recipientId <= 0 ||
      recipientId === req.user.id
    ) {
      return res.status(400).json({ error: 'Destinataire invalide.' });
    }

    if (!body || body.length > 2000) {
      return res.status(400).json({
        error: 'Le message doit contenir entre 1 et 2000 caractères.'
      });
    }

    const recipient = await query(
      `SELECT id FROM users
       WHERE id = $1 AND status = 'active'`,
      [recipientId]
    );

    if (recipient.rows.length === 0) {
      return res.status(404).json({ error: 'Étudiant introuvable.' });
    }

    const { rows } = await query(
      `INSERT INTO messages (sender_id, recipient_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, recipient_id, body, created_at, read_at`,
      [req.user.id, recipientId, body]
    );
    await query(
  `INSERT INTO notifications (recipient_id, actor_id, type, message_id)
   VALUES ($1, $2, 'message', $3)`,
  [recipientId, req.user.id, rows[0].id]
);
sendNotificationToUser(recipientId, {
  type: 'message',
  messageId: rows[0].id,
  actorId: req.user.id
});

    res.status(201).json({ message: rows[0] });
  } catch (error) {
    next(error);
  }
});
export default router;