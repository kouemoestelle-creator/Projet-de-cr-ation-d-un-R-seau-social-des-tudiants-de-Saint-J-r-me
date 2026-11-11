import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Composer from '../components/Composer.jsx';
import PostList from '../components/PostList.jsx';

export default function Feed() {
    const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(before = null) {
    setError('');
    try {
      const data = await api(`/posts?limit=20${before ? `&before=${before}` : ''}`);
      setPosts((list) => (before ? [...list, ...data.posts] : data.posts));
      setCursor(data.nextCursor);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const postId = Number(searchParams.get('postId'));

  if (searchParams.has('postId')) {
    if (!Number.isInteger(postId) || postId <= 0) {
      setError('Identifiant de publication invalide.');
      setLoading(false);
      return;
    }

    async function loadOnePost() {
      try {
        const data = await api(`/posts/${postId}`);
        setPosts(data.post ? [data.post] : []);
        setCursor(null);
      } catch (err) {
        setError(err.message || 'Publication introuvable.');
      } finally {
        setLoading(false);
      }
    }

    loadOnePost();
  } else {
    load();
  }
}, [searchParams]);

  return (
    <>
    {searchParams.has('postId') && (
  <p>
    <Link to="/">← Retour au fil d'actualité</Link>
  </p>
)}
      <Composer onCreated={(post) => setPosts((list) => [post, ...list])} />
      {loading && <p className="muted center">Chargement du fil…</p>}
      {error && (
        <p className="error center" role="alert">
          {error} <button className="link-button" onClick={() => load()}>Réessayer</button>
        </p>
      )}
      {!loading && <PostList posts={posts} setPosts={setPosts} />}
      {cursor && (
        <button className="btn btn-light block" onClick={() => load(cursor)}>Voir les publications plus anciennes</button>
      )}
    </>
  );
}
