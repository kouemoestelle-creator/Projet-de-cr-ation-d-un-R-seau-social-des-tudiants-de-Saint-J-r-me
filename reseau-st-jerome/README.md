# Réseau Saint Jérôme — Sprint 1

Sprint 1 covers: registration with e-mail code (F1), login / password reset (F2), logout and session expiry (F3),
profile (F5), posts with image (F8) and chronological feed (F9).

Stack: React (Vite, installable PWA) · Node.js + Express · PostgreSQL.

## 1. Requirements

- Node.js 20 or newer (https://nodejs.org), Git, a code editor (VS Code)
- A PostgreSQL database (local install, or a free hosted one — copy its connection URL)

## 2. First run (about 10 minutes)

### Database
Create an empty database, for example `saintjerome` (pgAdmin, or `createdb saintjerome`).

### Server (terminal 1)
```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
```
Open `server/.env` and set `DATABASE_URL` and `JWT_SECRET`
(generate the secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
```bash
npm run db:init             # creates the tables
npm run db:seed             # imports the authorized students (sample list by default)
npm run dev                 # API on http://localhost:3000
```

### Client (terminal 2)
```bash
cd client
npm install
npm run dev                 # app on http://localhost:5173
```

## 3. Try it

1. Open http://localhost:5173 → **Créer mon compte**.
2. Enter `SJ-0001` (or `etudiant1@etu.example.cm`).
3. With no SMTP configured, the 6-digit code is printed **in the server terminal** (`[E-MAIL DE TEST]`).
4. Enter the code, choose a password (8+ characters, a letter and a number), accept the terms.
5. Publish a text and an image, edit your profile, log out, log in again.

### Real students list
Create `server/data/students.csv` with the header `matricule,email,nom,filiere,niveau` and one student per line
(no commas inside values), then run `npm run db:seed` again. **Never commit real student data to GitHub**
(add the file to `.gitignore`).

### First moderator / admin
For now, promote an account with SQL (the moderation screens come in Sprint 2):
```sql
UPDATE users SET role = 'moderator' WHERE matricule = 'SJ-0001';
```

## 4. Acceptance checks (from the cahier des charges)

| Scenario | How to check |
|---|---|
| R1 — unauthorized address refused | Register with `inconnu@gmail.com` → clear refusal message |
| R2 — valid registration then login | Steps in section 3 |
| R3 — text + image post | Feed shows it immediately (images are compressed to ~1 MB before upload) |
| R8 — brute force | 5 wrong passwords → account locked 15 minutes; wrong code 5 times → code invalidated |

## 5. Security measures already in place

- Passwords hashed with bcrypt (cost 12); codes stored as HMAC hashes, valid 10 minutes, 5 attempts, 1 per minute
- Session in an `httpOnly`, `SameSite=Lax` cookie (HTTPS-only in production), 12 h expiry, suspended accounts blocked at once
- Rate limiting (global and on sensitive routes), `helmet` security headers, parameterized SQL only
- Image upload: JPEG/PNG only, 5 MB max, file type checked from the real bytes, random file names, images visible only to logged-in users
- Server-side checks on every route (only the author edits a post; author or moderator deletes)

## 6. Deploy later (J13)

`cd client && npm run build` creates `client/dist`; the server then serves the app and the API from one address.
Set `NODE_ENV=production`, a real `SMTP_*` configuration, a strong `JWT_SECRET`, and use HTTPS.
Note: many free hosts erase the `uploads/` folder on restart — plan external image storage before the public launch.

## 7. Git

```bash
git init && git add . && git commit -m "Sprint 1 base"
git branch -M main
git remote add origin <your repository URL>
git push -u origin main
```
`.gitignore` already excludes `node_modules`, `.env`, `uploads` and `dist`.

## 8. API summary

| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/register/start | check the student list, send the code |
| POST | /api/auth/register/complete | verify code, create account, open session |
| POST | /api/auth/login · /logout | log in / out |
| GET | /api/auth/me | current user |
| POST | /api/auth/forgot · /reset | password reset with code |
| GET | /api/users/:id | view a profile |
| PATCH | /api/users/me | edit my profile |
| POST | /api/users/me/photo | profile photo |
| GET | /api/posts?before=&author=&limit= | feed (newest first) |
| POST | /api/posts | create a post (form-data: `body`, `image`) |
| PATCH · DELETE | /api/posts/:id | edit (author) / delete (author or moderator) |

## 9. Not in Sprint 1 (planned for Sprint 2)

Likes and comments, messaging and groups, reporting and moderation screens, notifications, search, blocking, account deletion.
