import PostCard from './PostCard.jsx';

// Affiche une liste de publications et répercute les modifications / suppressions dans l'état du parent.
export default function PostList({ posts, setPosts }) {
  if (posts.length === 0) return <p className="muted center">Aucune publication pour le moment.</p>;
  return posts.map((p) => (
    <PostCard
      key={p.id}
      post={p}
      onUpdated={(updated) => setPosts((list) => list.map((x) => (x.id === updated.id ? updated : x)))}
      onDeleted={(id) => setPosts((list) => list.filter((x) => x.id !== id))}
    />
  ));
}
