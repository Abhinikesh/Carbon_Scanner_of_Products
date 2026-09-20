import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../lib/api';

const AuthContext = createContext(null);

const DEFAULT_USER = {
  id: 'guest',
  _id: 'guest',
  name: 'Eco Explorer',
  email: 'guest@climatelens.io',
  avatar: '',
  badges: [],
  currentStreakDays: 1,
  preferences: {
    pushNotifications: true
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_USER);
  const [accessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // In open mode, the user is always considered ready/authenticated
  const isAuthenticated = true;

  const login = async () => ({ success: true });
  const loginWithGoogle = async () => ({ success: true });
  const register = async () => ({ success: true });
  const logout = async () => {};

  /**
   * Optionally refresh current user stats/badges from /auth/me if available
   */
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
      }
    } catch (err) {
      // Keep default user silently on failure
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
