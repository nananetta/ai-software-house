import { create } from 'zustand';
import type { User } from '../types/index';
import { setAccessToken } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAuthResolved: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  restoreSession: (user: User, token: string) => void;
  markAuthResolved: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isAuthResolved: false,

  login: (user, token) => {
    setAccessToken(token);
    set({ user, isAuthenticated: true, isAuthResolved: true });
  },

  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isAuthResolved: true });
  },

  setUser: (user) => {
    set({ user });
  },

  restoreSession: (user, token) => {
    setAccessToken(token);
    set({ user, isAuthenticated: true, isAuthResolved: true });
  },

  markAuthResolved: () => {
    set({ isAuthResolved: true });
  },
}));
