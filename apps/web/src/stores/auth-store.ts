'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthEmployee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: string;
  tenantId: string;
}

// Access token stored in memory only (not persisted to localStorage)
let inMemoryAccessToken: string | null = null;

interface AuthState {
  employee: AuthEmployee | null;
  isAuthenticated: boolean;

  getAccessToken: () => string | null;
  setAuth: (accessToken: string, employee: AuthEmployee) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      employee: null,
      isAuthenticated: false,

      getAccessToken: () => inMemoryAccessToken,

      setAuth: (accessToken, employee) => {
        inMemoryAccessToken = accessToken;
        set({ employee, isAuthenticated: true });
      },

      setAccessToken: (accessToken) => {
        inMemoryAccessToken = accessToken;
      },

      logout: () => {
        inMemoryAccessToken = null;
        set({
          employee: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'scheduler-auth',
      partialize: (state) => ({
        employee: state.employee,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Clean up any stale tokens from Phase 1 localStorage
        if (state) {
          const raw = localStorage.getItem('scheduler-auth');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed.state?.accessToken || parsed.state?.refreshToken) {
                delete parsed.state.accessToken;
                delete parsed.state.refreshToken;
                localStorage.setItem('scheduler-auth', JSON.stringify(parsed));
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      },
    },
  ),
);
