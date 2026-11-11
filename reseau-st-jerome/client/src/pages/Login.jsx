
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      await login(identifier, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth login-page">
      <section className="login-intro">
        <h1>Bienvenue sur SJ Connect</h1>

        <p className="login-subtitle">
          Le réseau social des étudiants de l'Université Catholique
          Saint Jérôme de Douala.
        </p>

        <p>
          Échangez avec vos camarades, partagez vos expériences,
          développez votre réseau et restez connectés à la vie
          universitaire.
        </p>
      </section>

      <form className="card form login-form" onSubmit={submit}>
        <h2>Connexion</h2>

        <label>
          E-mail institutionnel ou matricule
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p className="error" role="alert">{error}</p>
        )}

        <button className="btn" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>

        <p className="center">
          <Link to="/inscription">Créer mon compte</Link>
          {' · '}
          <Link to="/mot-de-passe-oublie">
            Mot de passe oublié
          </Link>
        </p>
      </form>

      <p className="login-footer">
        SJ Connect — Ensemble, connectons notre communauté universitaire.
      </p>
    </main>
  );
}
