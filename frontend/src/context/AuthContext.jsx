import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived state
  const isAuthenticated = !!user;

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshRes = await api.post('/auth/refresh');
        const { accessToken: token } = refreshRes.data;

        setAuthToken(token);
        setAccessToken(token);

        const userRes = await api.get('/auth/me');
        setUser(userRes.data.user);
      } catch (err) {
        // Silent fail is normal when the user is not logged in / has no valid cookie
        setAuthToken(null);
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Log in user with email + password
   * @param {string} email
   * @param {string} password
   */
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken: token, user: userData } = res.data;

      setAuthToken(token);
      setAccessToken(token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      throw new Error(errorMsg);
    }
  };

  /**
   * Sign in (or sign up) with a Google ID token credential
   * @param {string} credential  — the raw ID token from GoogleLogin's onSuccess callback
   */
  const loginWithGoogle = async (credential) => {
    try {
      const res = await api.post('/auth/google', { credential });
      const { accessToken: token, user: userData } = res.data;

      setAuthToken(token);
      setAccessToken(token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Google sign-in failed. Please try again.';
      throw new Error(errorMsg);
    }
  };

  /**
   * Register new user with email + password
   * @param {string} name
   * @param {string} email
   * @param {string} password
   */
  const register = async (name, email, password) => {
    try {
      const res = await api.post('/auth/register', { name, email, password });
      const { accessToken: token, user: userData } = res.data;

      setAuthToken(token);
      setAccessToken(token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed.';
      throw new Error(errorMsg);
    }
  };

  /**
   * Log out user
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore errors on logout request; clear state regardless
    } finally {
      setAuthToken(null);
      setAccessToken(null);
      setUser(null);
    }
  };

  /**
   * Refresh current user data from the database
   */
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (err) {
      console.error('[AuthContext] Failed to refresh user data:', err);
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
