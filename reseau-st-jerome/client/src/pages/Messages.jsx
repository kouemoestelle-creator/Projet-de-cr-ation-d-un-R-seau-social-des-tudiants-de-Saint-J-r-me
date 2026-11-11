import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import Avatar from '../components/Avatar.jsx';

export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function loadConversations() {
    try {
      const data = await api('/messages');
      setConversations(data.conversations || []);
    } catch {
      setError('Impossible de charger les conversations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  async function openConversation(student) {
    setSelected(student);
    setMessages([]);
    setUsers([]);
    setSearch('');
    setError('');

    try {
      const data = await api(`/messages/${student.id}`);
      setMessages(data.messages || []);
    } catch {
      setError('Impossible de charger les messages.');
    }
  }

  useEffect(() => {
    const userId = Number(searchParams.get('userId'));

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      userId === Number(user.id)
    ) {
      return;
    }

    async function openFromNotification() {
      try {
        const data = await api(`/users/${userId}`);
        const profile = data.user;

        if (profile) {
          await openConversation({
            id: profile.id,
            display_name:
              profile.display_name || profile.displayName || 'Étudiant',
            photo_path: profile.photo_path || profile.photoUrl || null
          });
        } else {
          setError('Étudiant introuvable.');
        }
      } catch {
        setError('Impossible d’ouvrir cette conversation.');
      }
    }

    openFromNotification();
  }, [searchParams, user.id]);

  async function searchUsers(value) {
    setSearch(value);

    if (value.trim().length < 2) {
      setUsers([]);
      return;
    }

    try {
      const data = await api(
        `/users?search=${encodeURIComponent(value.trim())}`
      );
      setUsers(data.users || []);
    } catch {
      setError('Impossible de rechercher les étudiants.');
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (!body.trim() || !selected || sending) return;

    setSending(true);
    setError('');

    try {
      await api('/messages', {
        method: 'POST',
        body: {
          recipientId: selected.id,
          body: body.trim()
        }
      });

      setBody('');

      const data = await api(`/messages/${selected.id}`);
      setMessages(data.messages || []);

      await loadConversations();
    } catch {
      setError('Impossible d’envoyer le message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <h1>Messages privés</h1>

      <p className="muted">
        Échange avec les autres étudiants de Saint Jérôme.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="form-group">
          <label>Rechercher un étudiant</label>

          <input
            value={search}
            onChange={event => searchUsers(event.target.value)}
            placeholder="Nom de l’étudiant..."
          />
        </div>

        {users.map(student => (
          <button
            key={student.id}
            type="button"
            className="btn btn-light"
            style={{ margin: '4px' }}
            onClick={() => openConversation(student)}
          >
            {student.display_name}
          </button>
        ))}
      </div>

      <div className="card">
        <h2>Mes conversations</h2>

        {loading ? (
          <p className="muted">Chargement des conversations...</p>
        ) : conversations.length === 0 ? (
          <p className="muted">
            Aucune conversation pour le moment.
          </p>
        ) : (
          conversations.map(conversation => (
            <button
              key={conversation.user_id}
              type="button"
              className="card row"
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                background: '#fff',
                border: '1px solid #e5e7eb'
              }}
              onClick={() =>
                openConversation({
                  id: conversation.user_id,
                  display_name: conversation.display_name,
                  photo_path: conversation.photo_path
                })
              }
            >
              <Avatar
                name={conversation.display_name}
                photoUrl={conversation.photo_path}
                size={48}
              />

              <div className="grow">
                <strong>{conversation.display_name}</strong>

                <p className="muted small">
                  {conversation.body}
                </p>

                <small className="muted">
                  {new Date(conversation.created_at).toLocaleString('fr-FR')}
                </small>
              </div>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="card">
          <div className="row">
            <Avatar
              name={selected.display_name}
              photoUrl={selected.photo_path}
              size={44}
            />

            <h2>{selected.display_name}</h2>
          </div>

          <div style={{ marginTop: '16px' }}>
            {messages.length === 0 ? (
              <p className="muted center">
                Aucun message. Commence la conversation !
              </p>
            ) : (
              messages.map(message => {
                const isMine =
                  Number(message.sender_id) === Number(user.id);

                return (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      justifyContent: isMine
                        ? 'flex-end'
                        : 'flex-start',
                      marginBottom: '12px'
                    }}
                  >
                    <article
                      style={{
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        background: isMine ? '#dbeafe' : '#f3f4f6',
                        overflowWrap: 'anywhere'
                      }}
                    >
                      <p style={{ margin: '0 0 6px' }}>
                        {message.body}
                      </p>

                      <small className="muted">
                        {new Date(message.created_at).toLocaleTimeString(
                          'fr-FR',
                          {
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )}

                        {isMine && (
                          <>
                            {' · '}
                            {message.read_at ? 'Lu ✓✓' : 'Envoyé ✓'}
                          </>
                        )}
                      </small>
                    </article>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={sendMessage}>
            <textarea
              value={body}
              onChange={event => setBody(event.target.value)}
              placeholder="Écris ton message..."
              maxLength={2000}
              required
            />

            <button
              type="submit"
              className="btn"
              disabled={sending || !body.trim()}
            >
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}