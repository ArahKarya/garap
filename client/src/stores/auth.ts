import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, AuthUser } from '@garap/shared';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: AuthUser, tokens: AuthTokens) => void;
  clear: () => void;
  hasPermission: (key: string) => boolean;
  hasRole: (name: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
      hasPermission: (key) => {
        const u = get().user;
        if (!u) return false;
        if (u.roles.includes('SUPER_ADMIN')) return true;
        return u.permissions.includes(key);
      },
      hasRole: (name) => get().user?.roles.includes(name) ?? false,
    }),
    { name: 'arahkarya-auth' },
  ),
);
