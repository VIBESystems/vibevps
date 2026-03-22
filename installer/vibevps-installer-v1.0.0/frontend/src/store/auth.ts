import { create } from 'zustand';
import { api } from '../api/client';

interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!api.getToken(),
  loading: true,

  login: async (username, password) => {
    const { token, user } = await api.login(username, password);
    api.setToken(token);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    api.setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    if (!api.getToken()) {
      set({ loading: false, isAuthenticated: false });
      return;
    }
    try {
      const user = await api.me();
      set({ user, isAuthenticated: true, loading: false });
    } catch {
      api.setToken(null);
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },
}));
