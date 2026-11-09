import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';
import { submitPredictionKey, submitPredictionMutation } from '@/hooks/use-predictions';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export const CACHE_MAX_AGE = 7 * 24 * 60 * 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: CACHE_MAX_AGE,
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

queryClient.setMutationDefaults(submitPredictionKey, submitPredictionMutation);

export const persister = createAsyncStoragePersister({
  storage: Storage,
  key: 'lightsout.queryCache',
});

function clearCache() {
  queryClient.clear();
  void persister.removeClient();
}

export function resumeQueuedMutations() {
  const resume = (status: 'signedIn' | 'signedOut') => {
    if (status === 'signedIn') void queryClient.resumePausedMutations();
    else clearCache();
  };
  const { status } = useAuthStore.getState();
  if (status !== 'loading') {
    resume(status);
    return;
  }
  const unsubscribe = useAuthStore.subscribe((state) => {
    if (state.status === 'loading') return;
    unsubscribe();
    resume(state.status);
  });
}

useAuthStore.subscribe((state, previous) => {
  const signedOut = previous.status === 'signedIn' && state.status === 'signedOut';
  const signedIn = previous.status === 'signedOut' && state.status === 'signedIn';
  if (signedOut || signedIn) clearCache();
});
