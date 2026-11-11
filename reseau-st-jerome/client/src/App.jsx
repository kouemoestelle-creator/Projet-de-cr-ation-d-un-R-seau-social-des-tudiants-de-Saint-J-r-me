import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Forgot from './pages/Forgot.jsx';
import Terms from './pages/Terms.jsx';
import Feed from './pages/Feed.jsx';
import Profile from './pages/Profile.jsx';
import Messages from './pages/Messages.jsx';
import Notifications from './pages/Notifications.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="center muted">Chargement…</p>;
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center muted">Chargement…</p>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/inscription" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/mot-de-passe-oublie" element={<GuestOnly><Forgot /></GuestOnly>} />
      <Route path="/conditions" element={<Terms />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Feed />} />
        <Route path="profil" element={<Profile />} />
        <Route path="profil/:id" element={<Profile />} />
       <Route path="messages" element={<Messages />} /> 
       <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
