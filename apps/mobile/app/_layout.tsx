import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Predict' }} />
      <Stack.Screen name="race-detail" options={{ title: 'Race Detail' }} />
    </Stack>
  );
}
