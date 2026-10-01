import { router } from 'expo-router';
import { Button, Text, View } from 'react-native';

export default function PredictScreen() {
  return (
    <View>
      <Text>Lights Out</Text>

      <Text>Make your prediction before race lockout.</Text>

      <Button title="View race details" onPress={() => router.push('/race-detail')} />
    </View>
  );
}
