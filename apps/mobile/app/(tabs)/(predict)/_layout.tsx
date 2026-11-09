import { Stack } from 'expo-router/stack';

export const unstable_settings = {
  anchor: 'index',
};

export default function PredictLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Predict' }} />
      <Stack.Screen name="race-detail" options={{ title: 'Race Detail' }} />
      <Stack.Screen name="prediction" options={{ title: 'Your prediction' }} />
    </Stack>
  );
}
