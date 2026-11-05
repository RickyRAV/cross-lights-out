import { Link } from 'expo-router';
import { PlaceholderScreen } from '../../components/placeholder-screen';

export default function PredictScreen() {
  return (
    <PlaceholderScreen
      title="Predict"
      description="Your next race, lockout countdown, and driver picks will appear here."
    >
      <Link href="/race-detail" accessibilityRole="link" style={{ color: '#a5b4fc', fontSize: 17 }}>
        View race details
      </Link>
    </PlaceholderScreen>
  );
}
