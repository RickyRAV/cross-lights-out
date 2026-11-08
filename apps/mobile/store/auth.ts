import type { TokenPairResponse } from '@lightsout/shared';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const ACCESS_TOKEN_KEY = 'lightsout.accessToken';
const REFRESH_TOKEN_KEY = 'lightsout.refreshToken';

type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  accessToken: string | null;
  refreshToken: string | null;
  hydrate: () => Promise<void>;
  setTokens: (tokens: TokenPairResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);
      set({ accessToken, refreshToken, status: refreshToken ? 'signedIn' : 'signedOut' });
    } catch {
      set({ accessToken: null, refreshToken: null, status: 'signedOut' });
    }
  },

  setTokens: async ({ accessToken, refreshToken }) => {
    set({ accessToken, refreshToken, status: 'signedIn' });
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },

  signOut: async () => {
    set({ accessToken: null, refreshToken: null, status: 'signedOut' });
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  },
}));
