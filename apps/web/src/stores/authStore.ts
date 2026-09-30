import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'CLIENT' | 'CLIENT_MASTER' | 'AGENT' | 'AGENT_MASTER' | 'ADMIN';

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
}

/**
 * Decodes the payload of a JWT without verifying its signature. Verification
 * happens server-side; this is only used to derive display/UI state (email,
 * role) from a token we already trust because we just received it from our
 * own API or loaded it from our own persisted storage.
 */
function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    const parsed = JSON.parse(decoded) as Partial<AuthUser>;
    if (!parsed.sub || !parsed.email || !parsed.role) {
      return null;
    }
    return { sub: parsed.sub, email: parsed.email, role: parsed.role };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token: string) => {
        set({ token, user: decodeJwtPayload(token) });
      },
      logout: () => {
        set({ token: null, user: null });
      },
    }),
    {
      name: 'aponta-auth',
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          state.user = decodeJwtPayload(state.token);
        }
      },
    },
  ),
);
