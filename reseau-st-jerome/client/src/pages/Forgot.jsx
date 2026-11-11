import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Forgot() {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/forgot', { method: 'POST', body: { identifier } });
      setInfo(data.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/reset', { method: 'POST', body: { identifier, code, newPassword } });
      setInfo(data.message);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <h1>Mot de passe oublié</h1>
      {done ? (
        <div className="card form">
          <p className="success">{info}</p>
          <Link className="btn" to="/connexion">Se connecter</Link>
        </div>
      ) : step === 1 ? (
        <form className="card form" onSubmit={sendCode}>
          <label>
            E-mail institutionnel ou matricule
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Envoi…' : 'Recevoir un code'}</button>
        </form>
      ) : (
        <form className="card form" onSubmit={reset}>
          <p className="muted">{info}</p>
          <label>
            Code reçu (6 chiffres)
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoComplete="one-time-code" required />
          </label>
          <label>
            Nouveau mot de passe (8 caractères minimum, avec une lettre et un chiffre)
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={72} required />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : 'Changer le mot de passe'}</button>
        </form>
      )}
      <p className="center"><Link to="/connexion">Retour à la connexion</Link></p>
    </main>
  );
}
