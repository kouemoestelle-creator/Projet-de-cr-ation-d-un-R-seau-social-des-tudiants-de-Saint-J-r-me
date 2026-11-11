
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadNotifications() {
    try {
      setError('');
      const data = await api('/notifications');
      setNotifications(data.notifications || []);
    } catch {
      setError('Impossible de charger les notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAsRead(id) {
    try {
      await api(`/notifications/${id}/read`, {
        method: 'PATCH'
      });

      setNotifications(previous =>
        previous.map(item =>
          item.id === id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch {
      setError('Impossible de marquer cette notification comme lue.');
    }
  }

  async function markAllAsRead() {
    setBusy(true);
    setError('');

    try {
      await api('/notifications/read-all', {
        method: 'PATCH'
      });

      setNotifications(previous =>
        previous.map(item => ({
          ...item,
          read_at: item.read_at || new Date().toISOString()
        }))
      );
    } catch {
      setError('Impossible de tout marquer comme lu.');
    } finally {
      setBusy(false);
    }
  }

  const unreadCount = notifications.filter(item => !item.read_at).length;

  function notificationText(type) {
    if (type === 'message') return "t'a envoyé un message.";
    if (type === 'like') return 'a aimé ta publication.';
    return 'a commenté ta publication.';
  }

  function notificationLink(item) {
    if (item.type === 'message') {
      return `/messages?userId=${item.actor_id}`;
    }

    return `/?postId=${item.post_id}`;
  }

  return (
    <section>
      <div className="row between">
        <div>
          <h1>Mes notifications</h1>
          <p className="muted small">
            {unreadCount} notification(s) non lue(s)
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-light"
            onClick={markAllAsRead}
            disabled={busy}
          >
            {busy ? 'Patientez...' : 'Tout marquer comme lu'}
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted center">Chargement des notifications...</p>
      ) : notifications.length === 0 ? (
        <article className="card center">
          <h2>Tout est calme ici !</h2>
          <p className="muted">
            Tu n'as pas encore reçu de notification.
          </p>
        </article>
      ) : (
        <div>
          {notifications.map(item => (
            <article
              key={item.id}
              className="card"
              style={{
                borderLeft: item.read_at
                  ? '3px solid transparent'
                  : '3px solid #2563eb',
                background: item.read_at ? '#fff' : '#eff6ff'
              }}
            >
              <div className="row">
                <Avatar
                  name={item.actor_name}
                  photoUrl={item.actor_photo}
                  size={42}
                />

                <div className="grow">
                  <p>
                    <strong>{item.actor_name}</strong>{' '}
                    {notificationText(item.type)}
                  </p>

                  <small className="muted">
                    {new Date(item.created_at).toLocaleString('fr-FR')}
                  </small>
                </div>
              </div>

              <div className="row" style={{ marginTop: '12px' }}>
                <Link
                  className="btn btn-light"
                  to={notificationLink(item)}
                  onClick={() => {
                    if (!item.read_at) markAsRead(item.id);
                  }}
                >
                  {item.type === 'message'
                    ? 'Voir la conversation'
                    : 'Voir la publication'}
                </Link>

                {!item.read_at && (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => markAsRead(item.id)}
                  >
                    Marquer comme lue
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
