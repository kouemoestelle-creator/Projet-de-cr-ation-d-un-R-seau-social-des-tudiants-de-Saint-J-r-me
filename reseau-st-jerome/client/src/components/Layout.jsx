
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Avatar from './Avatar.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const data = await api('/notifications');
        setUnreadCount(data.unreadCount || 0);
      } catch {
        console.error('Impossible de charger les notifications');
      }
    }

    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 5000);

    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/connexion', { replace: true });
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">

          <NavLink to="/" className="brand" onClick={closeMenu}>
            <strong>Réseau Saint Jérôme</strong>
          </NavLink>

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>

            <NavLink to="/" end onClick={closeMenu}>
              Fil
            </NavLink>

            <NavLink to="/messages" onClick={closeMenu}>
              Messages
            </NavLink>

            <NavLink to="/notifications" onClick={closeMenu}>
              Notifications
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount}
                </span>
              )}
            </NavLink>

            <NavLink to="/profil" onClick={closeMenu}>
              <Avatar
                name={user.displayName}
                photoUrl={user.photoUrl}
                size={26}
              />
              Profil
            </NavLink>

            <button
              type="button"
              className="link-button logout-button"
              onClick={handleLogout}
            >
              Déconnexion
            </button>

          </nav>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
