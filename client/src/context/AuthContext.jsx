import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('irmp-user')); } catch { return null; }
  });
  const [checking, setChecking] = useState(Boolean(localStorage.getItem('irmp-token')));

  useEffect(() => {
    if (!localStorage.getItem('irmp-token')) { setChecking(false); return; }
    api.get('/auth/me').then(({ data }) => {
      setUser(data.user); localStorage.setItem('irmp-user', JSON.stringify(data.user));
    }).catch(() => { localStorage.removeItem('irmp-token'); localStorage.removeItem('irmp-user'); setUser(null); })
      .finally(() => setChecking(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('irmp-token', data.token);
    localStorage.setItem('irmp-user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('irmp-token', data.token);
    localStorage.setItem('irmp-user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };
  const logout = () => { localStorage.removeItem('irmp-token'); localStorage.removeItem('irmp-user'); setUser(null); };
  const updateUser = (updates) => {
    setUser((current) => {
      const next = { ...current, ...updates };
      localStorage.setItem('irmp-user', JSON.stringify(next));
      return next;
    });
  };
  const value = useMemo(() => ({ user, checking, login, register, logout, updateUser }), [user, checking]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
