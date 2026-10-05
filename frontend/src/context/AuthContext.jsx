import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await apiClient.getMe();
      setUser(userData);
      setAuthError(null);
      return userData;
    } catch (err) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async ({ email, password }) => {
    setAuthError(null);
    try {
      const userData = await apiClient.login({ email, password });
      setUser(userData);
      return userData;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  const signup = async ({ email, password, confirm_password }) => {
    setAuthError(null);
    try {
      const userData = await apiClient.signup({ email, password, confirm_password });
      setUser(userData);
      return userData;
    } catch (err) {
      setAuthError(err.message || 'Sign up failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
    }
  };

  const forgotPassword = async ({ email }) => {
    setAuthError(null);
    return apiClient.forgotPassword({ email });
  };

  const resetPassword = async ({ token, new_password, confirm_password }) => {
    setAuthError(null);
    return apiClient.resetPassword({ token, new_password, confirm_password });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        authError,
        login,
        signup,
        logout,
        forgotPassword,
        resetPassword,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
