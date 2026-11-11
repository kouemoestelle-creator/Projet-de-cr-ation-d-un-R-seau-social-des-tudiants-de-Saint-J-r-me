
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { addNotificationClient } from '../notificationStream.js';

const router = Router();

router.use(requireAuth);

// Connexion aux notifications instantanées
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  addNotificationClient(req.user.id, res);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  res.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Afficher les notifications
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
        n.id,
        n.type,
        n.post_id,
        n.message_id,
        n.read_at,
        n.created_at,
        u.id AS actor_id,
        u.display_name AS actor_name,
        u.photo_path AS actor_photo
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      notifications: rows,
      unreadCount: rows.filter(n => !n.read_at).length
    });
  } catch (error) {
    next(error);
  }
});
// Marquer toutes les notifications comme lues
router.patch('/read-all', async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications
       SET read_at = now()
       WHERE recipient_id = $1
       AND read_at IS NULL`,
      [req.user.id]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Marquer une notification comme lue
router.patch('/:id/read', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'Notification invalide.'
      });
    }

    const { rows } = await query(
      `UPDATE notifications
       SET read_at = now()
       WHERE id = $1 AND recipient_id = $2
       RETURNING id, read_at`,
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Notification introuvable.'
      });
    }

    res.json({ notification: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
