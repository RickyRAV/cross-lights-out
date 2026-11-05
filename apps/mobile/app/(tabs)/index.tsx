import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function PredictScreen() {
  return (
    <PlaceholderScreen
      title="Predict"
      description="Your next race, lockout countdown, and driver picks will appear here."
    >
      <Link href="/race-detail" asChild>
        <Pressable accessibilityRole="link">
          <Text className="text-lg text-accent">View race details</Text>
        </Pressable>
      </Link>
    </PlaceholderScreen>
  );
}
