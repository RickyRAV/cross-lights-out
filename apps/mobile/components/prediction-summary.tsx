import type { RaceResponse } from '@lightsout/shared';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { ActionButton, DriverRows, StatusPill } from '@/components/race-ui';
import { useMyPrediction } from '@/hooks/use-predictions';
import { useDrivers } from '@/hooks/use-drivers';

export function PredictionSummary({
  race,
  closed = false,
}: {
  race: RaceResponse;
  closed?: boolean;
}) {
  const prediction = useMyPrediction(race.raceId);
  const drivers = useDrivers();
  const open = () => router.push({ pathname: '/prediction', params: { raceId: race.raceId } });

  if (prediction.data === undefined) {
    return (
      <View className="gap-3">
        <Text className="text-sm text-muted">
          {prediction.error
            ? "Couldn't load your prediction."
            : prediction.fetchStatus === 'paused'
              ? "You're offline. Connect to load your prediction."
              : 'Loading your prediction…'}
        </Text>
        {(prediction.error || prediction.fetchStatus === 'paused') && (
          <ActionButton
            secondary
            label="Retry prediction"
            disabled={prediction.isFetching || prediction.fetchStatus === 'paused'}
            onPress={() => {
              void prediction.refetch();
            }}
          />
        )}
      </View>
    );
  }

  if (!prediction.data) {
    return closed ? null : (
      <View className="gap-3">
        <Text className="text-sm text-muted">
          Pick the top five drivers in finishing order before predictions close.
        </Text>
        <ActionButton label="Build your prediction" onPress={open} />
      </View>
    );
  }

  return (
    <View className="gap-3">
      {closed && <Text className="text-lg font-semibold text-foreground">{race.name}</Text>}
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-sm font-semibold text-muted">
          {closed ? 'Your latest locked prediction' : 'Your top 5'}
        </Text>
        <StatusPill
          label={closed ? 'Locked' : 'Submitted'}
          variant={closed ? 'score' : 'submitted'}
        />
      </View>
      <DriverRows
        picks={prediction.data.predictedOrder.map((code) => ({
          code,
          team: drivers.data?.find((driver) => driver.code === code)?.team,
        }))}
      />
      {prediction.error && (
        <Text accessibilityRole="alert" className="text-sm text-muted">
          Couldn't refresh your prediction. Showing the last saved picks.
        </Text>
      )}
      <Text className="text-xs leading-5 text-muted">
        {closed
          ? 'Predictions are closed. Your submitted picks cannot be changed.'
          : 'Your picks are saved. Friends cannot see them before lockout.'}
      </Text>
      <ActionButton
        secondary
        label={closed ? 'View locked prediction' : 'Change prediction'}
        onPress={open}
      />
    </View>
  );
}
