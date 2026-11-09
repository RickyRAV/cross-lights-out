import '@/global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { router, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ConnectionError } from '@/components/connection-error';
import { useMyGroup } from '@/hooks/use-groups';
import {
  useLockoutReminder,
  useReminderPermission,
  useReminderPromptHandled,
} from '@/hooks/use-reminders';
import { queryClient } from '@/lib/query-client';
import '@/lib/reminders';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { navigationTheme } from '@/theme/navigation';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const authStatus = useAuthStore((state) => state.status);
  const signedIn = authStatus === 'signedIn';
  const group = useMyGroup({ enabled: signedIn });
  const showingCreatedGroup = useOnboardingStore((state) => state.createdGroup !== null);

  const groupSettled = !group.isPending || group.fetchStatus === 'paused';
  const ready = authStatus === 'signedOut' || (signedIn && groupSettled);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  if (signedIn && group.data === undefined) {
    return <ConnectionError onRetry={() => group.refetch()} />;
  }

  const inApp = group.data != null && !showingCreatedGroup;

  return (
    <>
      {inApp && <Reminders />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="register" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !inApp}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && inApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="reminder-permission"
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function Reminders() {
  useLockoutReminder();
  const permission = useReminderPermission();
  const promptHandled = useReminderPromptHandled();
  const prompted = useRef(false);

  useEffect(() => {
    if (prompted.current || permission.data !== 'askable' || promptHandled.data !== false) return;
    prompted.current = true;
    router.push('/reminder-permission');
  }, [permission.data, promptHandled.data]);

  return null;
}
