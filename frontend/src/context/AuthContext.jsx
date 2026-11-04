import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../api/client';
import { makeMoneyFormatter } from '../utils/format';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // restore the session
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  // any 401 from the API (expired token) signs the user out
  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const authenticate = useCallback(async (path, payload) => {
    const res = await api.post(path, payload);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setUser(res.data.user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      logout,
      login: (data) => authenticate('/auth/login', data),
      register: (data) => authenticate('/auth/register', data),
      fmt: makeMoneyFormatter(user?.currency || 'INR'),
    }),
    [user, loading, logout, authenticate]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);