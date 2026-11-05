import '@/global.css';
import { Stack, ThemeProvider } from 'expo-router';
import { navigationTheme } from '@/theme/navigation';

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="race-detail" options={{ title: 'Race Detail' }} />
      </Stack>
    </ThemeProvider>
  );
}
