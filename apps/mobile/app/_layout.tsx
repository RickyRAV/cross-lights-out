import '@/global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth';
import { navigationTheme } from '@/theme/navigation';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const authStatus = useAuthStore((state) => state.status);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (authStatus !== 'loading') SplashScreen.hide();
  }, [authStatus]);

  if (authStatus === 'loading') return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
