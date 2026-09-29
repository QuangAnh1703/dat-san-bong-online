import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const stored = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      if (stored && storedUser) {
        setToken(stored);
        try {
          setUser(JSON.parse(storedUser));
        } catch (err) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setLoading(false);
          return;
        }

        // Sync user data from server to ensure consistency
        try {
          const response = await api.get('/api/profile', {
            headers: { Authorization: `Bearer ${stored}` }
          });
          setUser(response.data);
          localStorage.setItem('auth_user', JSON.stringify(response.data));
        } catch (err) {
          // Still keep the user logged in with cached data if sync fails
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (data) => {
    const userData = data.user || data;
    setUser(userData);
    setToken(data.access_token);
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const updateProfile = (profileData) => {
    const updated = { ...user, ...profileData };
    setUser(updated);
    localStorage.setItem('auth_user', JSON.stringify(updated));
  };

  const value = { user, token, loading, login, logout, updateProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
