import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function Register() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accept, setAccept] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode(e) {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/register/start', { method: 'POST', body: { identifier } });
      setInfo(data.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function complete(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Les deux mots de passe ne sont pas identiques.');
    setBusy(true);
    try {
      const data = await api('/auth/register/complete', {
        method: 'POST',
        body: { identifier, code, password, acceptTerms: accept },
      });
      setUser(data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <h1>Créer mon compte</h1>
      {step === 1 ? (
        <form className="card form" onSubmit={sendCode}>
          <p className="muted">L’inscription est réservée aux étudiants de Saint Jérôme. Un code sera envoyé à votre adresse institutionnelle.</p>
          <label>
            E-mail institutionnel ou matricule
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Envoi…' : 'Recevoir un code'}</button>
        </form>
      ) : (
        <form className="card form" onSubmit={complete}>
          <p className="success">{info}</p>
          <label>
            Code reçu (6 chiffres)
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoComplete="one-time-code" required />
          </label>
          <label>
            Mot de passe (8 caractères minimum, avec une lettre et un chiffre)
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={72} required />
          </label>
          <label>
            Confirmer le mot de passe
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </label>
          <label className="check">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>J’accepte les <Link to="/conditions" target="_blank">conditions d’utilisation</Link></span>
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={busy || !accept}>{busy ? 'Création…' : 'Créer mon compte'}</button>
          <button type="button" className="link-button" onClick={sendCode} disabled={busy}>Renvoyer un code</button>
        </form>
      )}
      <p className="center"><Link to="/connexion">J’ai déjà un compte</Link></p>
    </main>
  );
}
