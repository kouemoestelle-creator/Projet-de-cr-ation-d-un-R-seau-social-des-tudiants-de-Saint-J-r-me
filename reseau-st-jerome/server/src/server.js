import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
app.set('trust proxy', 1); // derrière le proxy de l’hébergeur : nécessaire pour compter les IP correctement
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'blob:'],
      },
    },
  })
);
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

app.use(
  '/api',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false })
);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Les images ne sont visibles que par les étudiants connectés.
app.use('/uploads', requireAuth, express.static(config.uploadDir, { index: false, dotfiles: 'deny', maxAge: '7d' }));

// En production, le serveur distribue aussi l'application web construite (client/dist).
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ error: 'Page introuvable.' }));

// Gestionnaire d'erreurs : on ne renvoie jamais les détails techniques au navigateur.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image trop lourde (5 Mo maximum).' : 'Envoi de fichier invalide.';
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: message });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Erreur du serveur. Réessayez dans un instant.' });
});

app.listen(config.port, () => {
  console.log(`Serveur démarré sur http://localhost:${config.port}`);
});
