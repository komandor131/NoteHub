import React, { createContext, useContext, useEffect, useState } from 'react';
import * as api from './api';
import type { UserRecord } from './types';

interface AuthContextType {
  user: UserRecord | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: UserRecord) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.setToken(token);
      api.fetchMe()
        .then((res) => {
          if (res.user) {
            setUser(res.user);
          } else {
            setToken(null);
            localStorage.removeItem('token');
          }
        })
        .catch(() => {
          setToken(null);
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: UserRecord) => {
    localStorage.setItem('token', newToken);
    api.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    api.logoutApi().catch(() => {});
    localStorage.removeItem('token');
    api.setToken('');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
