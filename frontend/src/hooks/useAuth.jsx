import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

function safeParse(str) {
  if (!str || str === 'undefined' || str === 'null') return null;
  try { return JSON.parse(str); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => safeParse(localStorage.getItem('cp_user')));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cp_user');
    if (stored === 'undefined' || stored === 'null') {
      localStorage.removeItem('cp_user');
      localStorage.removeItem('cp_token');
      setUser(null);
    }
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('cp_token', data.token);
      localStorage.setItem('cp_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    } finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
    setUser(null);
  };

  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { username, email, password });
      localStorage.setItem('cp_token', data.token);
      localStorage.setItem('cp_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Registration failed' };
    } finally { setLoading(false); }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
