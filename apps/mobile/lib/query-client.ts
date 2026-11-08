import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState } from 'react-native';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) =>
        failureCount < 2 &&
        error instanceof ApiError &&
        (error.status === 0 || error.status >= 500),
    },
    mutations: { retry: false },
  },
});

onlineManager.setEventListener((setOnline) => {
  let initialized = false;
  const subscription = Network.addNetworkStateListener((state) => {
    initialized = true;
    setOnline(!!state.isConnected);
  });
  Network.getNetworkStateAsync()
    .then((state) => {
      if (!initialized) setOnline(!!state.isConnected);
    })
    .catch(() => undefined);
  return () => subscription.remove();
});

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

useAuthStore.subscribe((state, previous) => {
  if (previous.status === 'signedIn' && state.status === 'signedOut') queryClient.clear();
});
