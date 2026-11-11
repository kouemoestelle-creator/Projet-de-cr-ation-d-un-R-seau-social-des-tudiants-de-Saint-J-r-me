export const fileUrl = (p) => (p ? `/uploads/${p}` : null);

export const publicUser = (u) => ({
  id: u.id,
  displayName: u.display_name,
  filiere: u.filiere,
  niveau: u.niveau,
  bio: u.bio,
  photoUrl: fileUrl(u.photo_path),
  role: u.role,
  createdAt: u.created_at,
});

// Données visibles uniquement par la personne elle-même.
export const privateUser = (u) => ({ ...publicUser(u), email: u.email, matricule: u.matricule });

export const POST_SELECT = `
  SELECT
    p.id,
    p.body,
    p.image_path,
    p.is_announcement,
    p.created_at,
    p.updated_at,
    p.author_id,
    u.display_name AS author_name,
    u.photo_path AS author_photo,
    u.filiere AS author_filiere,
    u.niveau AS author_niveau,
    (SELECT COUNT(*)::int
     FROM post_likes l
     WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*)::int
     FROM post_comments c
     WHERE c.post_id = p.id) AS comment_count,
    EXISTS (
      SELECT 1
      FROM post_likes l
      WHERE l.post_id = p.id
        AND l.user_id = $1
    ) AS liked_by_me
  FROM posts p
  JOIN users u ON u.id = p.author_id
`;
  

export const mapPost = (r) => ({
  id: r.id,
  body: r.body,
  imageUrl: fileUrl(r.image_path),
  isAnnouncement: r.is_announcement,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  likeCount: r.like_count,
  commentCount: r.comment_count,
  likedByMe: r.liked_by_me,
  author: {
    id: r.author_id,
    displayName: r.author_name,
    photoUrl: fileUrl(r.author_photo),
    filiere: r.author_filiere,
    niveau: r.author_niveau,
  },
});