import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isLoggedIn: boolean;
}

const TOKEN_KEY = 'galgenspiel-token';

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: !!localStorage.getItem(TOKEN_KEY),
    isLoggedIn: false,
  });

  // Validate existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    api
      .get('/api/auth/me')
      .then((res) => {
        setState({
          user: {
            id: res.data.id,
            email: res.data.email,
            displayName: res.data.displayName,
          },
          loading: false,
          isLoggedIn: true,
        });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, loading: false, isLoggedIn: false });
      });
  }, []);

  // Listen for auth-expired event from axios interceptor
  useEffect(() => {
    const handler = () => {
      setState({ user: null, loading: false, isLoggedIn: false });
    };
    window.addEventListener('auth-expired', handler);
    return () => window.removeEventListener('auth-expired', handler);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const res = await api.post('/api/auth/register', {
        email,
        password,
        displayName,
      });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setState({
        user: res.data.user,
        loading: false,
        isLoggedIn: true,
      });
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setState({
      user: res.data.user,
      loading: false,
      isLoggedIn: true,
    });
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, loading: false, isLoggedIn: false });
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    isLoggedIn: state.isLoggedIn,
    signUp,
    signIn,
    signOut,
  };
};
