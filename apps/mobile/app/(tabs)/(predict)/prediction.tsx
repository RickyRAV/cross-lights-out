import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { PredictionEditor } from '@/components/prediction-editor';
import { ActionButton } from '@/components/race-ui';
import { useRaces } from '@/hooks/use-races';

export default function PredictionScreen() {
  const { raceId } = useLocalSearchParams<{ raceId?: string | string[] }>();
  const calendar = useRaces();
  const id = typeof raceId === 'string' ? raceId : undefined;
  const race = calendar.data?.find((item) => item.raceId === id);

  if (!race)
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-lg font-semibold text-foreground">
          {!id
            ? 'No race selected'
            : calendar.data
              ? 'Race not found'
              : calendar.error
                ? "Couldn't load this race"
                : calendar.fetchStatus === 'paused'
                  ? "You're offline"
                  : 'Loading race…'}
        </Text>
        {id && !calendar.data && (
          <ActionButton
            secondary
            label="Retry"
            disabled={calendar.isFetching || calendar.fetchStatus === 'paused'}
            onPress={() => {
              void calendar.refetch();
            }}
          />
        )}
      </View>
    );

  return <PredictionEditor key={race.raceId} race={race} />;
}
