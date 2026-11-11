import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const onUnauthorized = () => setUser(null);
    window.addEventListener('sj:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sj:unauthorized', onUnauthorized);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      async login(identifier, password) {
        const d = await api('/auth/login', { method: 'POST', body: { identifier, password } });
        setUser(d.user);
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
