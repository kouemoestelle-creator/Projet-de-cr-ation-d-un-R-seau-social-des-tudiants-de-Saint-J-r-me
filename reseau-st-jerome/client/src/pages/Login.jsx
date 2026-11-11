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
    <main className="auth">
      <h1>Réseau Saint Jérôme</h1>
      <p className="muted">Connectez-vous avec votre e-mail institutionnel ou votre matricule.</p>
      <form className="card form" onSubmit={submit}>
        <label>
          E-mail institutionnel ou matricule
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Mot de passe
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      </form>
      <p className="center">
        <Link to="/inscription">Créer mon compte</Link> · <Link to="/mot-de-passe-oublie">Mot de passe oublié</Link>
      </p>
    </main>
  );
}
