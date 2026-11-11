import { initials } from '../utils/format.js';

export default function Avatar({ name, photoUrl, size = 40 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (photoUrl) return <img className="avatar" style={style} src={photoUrl} alt="" />;
  return (
    <span className="avatar avatar-initials" style={style} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
