-- Sprint 1 : comptes, profils, publications.
-- Peut être relancé sans danger (CREATE ... IF NOT EXISTS).

-- Liste officielle des étudiants autorisés à s'inscrire (fournie par l'établissement).
CREATE TABLE IF NOT EXISTS allowed_students (
  id SERIAL PRIMARY KEY,
  matricule TEXT UNIQUE NOT NULL,
  institutional_email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  filiere TEXT,
  niveau TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  allowed_student_id INTEGER UNIQUE REFERENCES allowed_students(id),
  email TEXT UNIQUE NOT NULL,
  matricule TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  filiere TEXT,
  niveau TEXT,
  bio TEXT NOT NULL DEFAULT '',
  photo_path TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'moderator', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Codes à usage unique (inscription et réinitialisation du mot de passe). Stockés sous forme d'empreinte.
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'reset')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_codes_lookup ON verification_codes (email, purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  is_announcement BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts (id DESC) WHERE status = 'visible';
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_id, id DESC);
-- Sprint 2 : J'aime et commentaires

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post
ON post_comments (post_id, created_at);
-- Sprint 3 : messagerie privée
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages (sender_id, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_recipient
ON messages (recipient_id, created_at DESC);
-- Sprint 4 : notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'like', 'comment')),
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (recipient_id <> actor_id),
  CHECK (
    (type = 'message' AND message_id IS NOT NULL AND post_id IS NULL)
    OR
    (type IN ('like', 'comment') AND post_id IS NOT NULL AND message_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
ON notifications (recipient_id, created_at DESC);