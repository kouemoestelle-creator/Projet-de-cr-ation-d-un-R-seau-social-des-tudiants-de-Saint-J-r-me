
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { formatDate } from '../utils/format.js';
import Avatar from './Avatar.jsx';

export default function PostCard({ post, onUpdated, onDeleted }) {
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(post.body || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const isAuthor = user.id === post.author.id;
  const canDelete = isAuthor || ['moderator', 'admin'].includes(user.role);
  const meta = [post.author.filiere, post.author.niveau]
    .filter(Boolean)
    .join(' · ');

  async function save() {
    setBusy(true);
    setError('');

    try {
      const data = await api(`/posts/${post.id}`, {
        method: 'PATCH',
        body: { body: text }
      });

      onUpdated(data.post);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Supprimer cette publication ?')) return;

    try {
      await api(`/posts/${post.id}`, { method: 'DELETE' });
      onDeleted(post.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleLike() {
    setError('');

    try {
      const data = await api(`/posts/${post.id}/like`, {
        method: liked ? 'DELETE' : 'POST'
      });

      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadComments() {
    try {
      const data = await api(`/posts/${post.id}/comments`);
      setComments(data.comments);
      setCommentsLoaded(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);

    if (next && !commentsLoaded) {
      await loadComments();
    }
  }

  async function addComment() {
    if (!commentText.trim()) return;

    setCommentBusy(true);
    setError('');

    try {
      const data = await api(`/posts/${post.id}/comments`, {
        method: 'POST',
        body: { body: commentText }
      });

      setComments(list => [...list, data.comment]);
      setCommentCount(data.commentCount);
      setCommentText('');
      setCommentsLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCommentBusy(false);
    }
  }

  return (
    <article className="card post">
      <header className="row">
        <Avatar
          name={post.author.displayName}
          photoUrl={post.author.photoUrl}
        />

        <div className="grow">
          <Link
            className="author"
            to={isAuthor ? '/profil' : `/profil/${post.author.id}`}
          >
            {post.author.displayName}
          </Link>

          <div className="muted small">
            {meta && `${meta} · `}
            {formatDate(post.createdAt)}
            {post.updatedAt && ' · modifié'}
          </div>
        </div>
      </header>

      {editing ? (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={2000}
            rows={3}
          />

          <div className="row">
            <button className="btn" onClick={save} disabled={busy}>
              Enregistrer
            </button>

            <button
              className="btn btn-light"
              onClick={() => {
                setEditing(false);
                setText(post.body || '');
              }}
            >
              Annuler
            </button>
          </div>
        </>
      ) : (
        post.body && <p className="body">{post.body}</p>
      )}

      {post.imageUrl && (
        <img
          className="post-image"
          src={post.imageUrl}
          alt="Image de la publication"
          loading="lazy"
        />
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <div className="row">
        <button
          type="button"
          className="link-button"
          onClick={toggleLike}
        >
          {liked ? '❤️ J’aime' : '🤍 J’aime'} ({likeCount})
        </button>

        <button
          type="button"
          className="link-button"
          onClick={toggleComments}
        >
          💬 Commentaires ({commentCount})
        </button>
      </div>

      {showComments && (
        <section className="comments">
          <h4>Commentaires</h4>

          {comments.length === 0 ? (
            <p className="muted small">
              Aucun commentaire pour le moment.
            </p>
          ) : (
            comments.map(comment => (
              <div className="row" key={comment.id}>
                <Avatar
                  name={comment.author.displayName}
                  photoUrl={comment.author.photoUrl}
                />

                <div>
                  <strong>{comment.author.displayName}</strong>
                  <p>{comment.body}</p>
                  <span className="muted small">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}

          <div className="row">
            <input
              type="text"
              placeholder="Écrire un commentaire..."
              value={commentText}
              maxLength={1000}
              onChange={e => setCommentText(e.target.value)}
            />

            <button
              className="btn"
              onClick={addComment}
              disabled={commentBusy || !commentText.trim()}
            >
              Envoyer
            </button>
          </div>
        </section>
      )}

      {!editing && (isAuthor || canDelete) && (
        <footer className="row">
          {isAuthor && (
            <button
              className="link-button"
              onClick={() => setEditing(true)}
            >
              Modifier
            </button>
          )}

          {canDelete && (
            <button
              className="link-button danger"
              onClick={remove}
            >
              Supprimer
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
