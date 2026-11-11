
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import PostList from '../components/PostList.jsx';
import { compressImage } from '../utils/compressImage.js';

export default function Profile() {
  const { id } = useParams();
  const { user: me, setUser } = useAuth();

  const targetId = id ? Number(id) : me.id;
  const own = targetId === me.id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    filiere: '',
    niveau: '',
    bio: ''
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const photoInput = useRef(null);
  const shown = own ? me : profile?.user;

  useEffect(() => {
    let cancelled = false;

    setError('');
    setEditing(false);
    setMessage('');
    setProfile(null);
    setPosts([]);

    api(`/users/${targetId}`)
      .then(data => {
        if (!cancelled) setProfile(data);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      });

    api(`/posts?author=${targetId}&limit=50`)
      .then(data => {
        if (!cancelled) setPosts(data.posts || []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [targetId]);

  function startEdit() {
    setForm({
      displayName: me.displayName || '',
      filiere: me.filiere || '',
      niveau: me.niveau || '',
      bio: me.bio || ''
    });

    setMessage('');
    setEditing(true);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const data = await api('/users/me', {
        method: 'PATCH',
        body: form
      });

      setUser(data.user);
      setEditing(false);
      setMessage('Profil enregistré avec succès.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changePhoto(e) {
    const chosen = e.target.files?.[0];
    e.target.value = '';

    if (!chosen) return;

    setBusy(true);
    setError('');

    try {
      const small = await compressImage(chosen, {
        maxSize: 512,
        quality: 0.85
      });

      const formData = new FormData();
      formData.append('photo', small);

      const data = await api('/users/me/photo', {
        method: 'POST',
        formData
      });

      setUser(data.user);
      setMessage('Photo mise à jour avec succès.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const set = key => e => {
    setForm(previous => ({
      ...previous,
      [key]: e.target.value
    }));
  };

  if (!shown) {
    return error
      ? <p className="error center" role="alert">{error}</p>
      : <p className="muted center">Chargement du profil...</p>;
  }

  return (
    <>
      <section className="card profile profile-card">

        <div className="profile-header">
          <Avatar
            name={shown.displayName}
            photoUrl={shown.photoUrl}
            size={96}
          />

          <div className="profile-details">
            <h1>{shown.displayName}</h1>

            <p className="profile-meta">
              {shown.filiere || 'Filière non renseignée'}
            </p>

            {shown.niveau && (
              <p className="profile-meta">
                {shown.niveau}
              </p>
            )}
          </div>
        </div>

        {shown.bio && !editing && (
          <div className="profile-bio">
            <h3>À propos</h3>
            <p className="body">{shown.bio}</p>
          </div>
        )}

        {own && !editing && (
          <div className="profile-actions">
            <button
              type="button"
              className="btn"
              onClick={startEdit}
            >
              Modifier mon profil
            </button>

            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png"
              onChange={changePhoto}
              hidden
            />

            <button
              type="button"
              className="btn btn-light"
              onClick={() => photoInput.current?.click()}
              disabled={busy}
            >
              Changer la photo
            </button>
          </div>
        )}

        {own && editing && (
          <form className="form profile-edit-form" onSubmit={save}>
            <h2>Modifier mes informations</h2>

            <label>
              Nom affiché
              <input
                value={form.displayName}
                onChange={set('displayName')}
                minLength={2}
                maxLength={80}
                required
              />
            </label>

            <label>
              Filière
              <input
                value={form.filiere}
                onChange={set('filiere')}
                maxLength={80}
              />
            </label>

            <label>
              Niveau
              <input
                value={form.niveau}
                onChange={set('niveau')}
                maxLength={40}
              />
            </label>

            <label>
              Biographie
              <textarea
                value={form.bio}
                onChange={set('bio')}
                maxLength={300}
                rows={4}
                placeholder="Présente-toi aux autres étudiants..."
              />
            </label>

            <div className="row">
              <button className="btn" disabled={busy}>
                {busy ? 'Enregistrement...' : 'Enregistrer'}
              </button>

              <button
                type="button"
                className="btn btn-light"
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {message && (
          <p className="success">{message}</p>
        )}

        {error && (
          <p className="error" role="alert">{error}</p>
        )}
      </section>

      <div className="profile-posts-heading">
        <h2>Publications</h2>
        <p className="muted small">
          Les publications de {shown.displayName}
        </p>
      </div>

      <PostList posts={posts} setPosts={setPosts} />
    </>
  );
}
