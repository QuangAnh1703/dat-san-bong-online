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

      console.log('[AuthContext] Init auth:', { hasToken: !!stored, hasUser: !!storedUser });

      if (stored && storedUser) {
        setToken(stored);
        setUser(JSON.parse(storedUser));

        // Sync user data from server to ensure consistency
        try {
          console.log('[AuthContext] Syncing user profile, token:', stored.substring(0, 20) + '...');
          const response = await api.get('/api/profile', {
            headers: { Authorization: `Bearer ${stored}` }
          });
          console.log('[AuthContext] Profile synced:', response.data);
          setUser(response.data);
          localStorage.setItem('auth_user', JSON.stringify(response.data));
        } catch (err) {
          console.warn('[AuthContext] Failed to sync user profile:', err.message);
          // Still keep the user logged in with cached data if sync fails
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (data) => {
    console.log('[AuthContext.login] Saving user:', { id: data.user.id, name: data.user.full_name, phone: data.user.phone });
    setUser(data.user);
    setToken(data.access_token);
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
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
