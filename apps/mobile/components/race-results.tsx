import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { ActionButton, DriverRows } from '@/components/race-ui';
import { useDrivers } from '@/hooks/use-drivers';
import { useHistory } from '@/hooks/use-history';
import { useRaceResult } from '@/hooks/use-races';

export function RaceResults({ raceId }: { raceId: string }) {
  const focused = useIsFocused();
  const result = useRaceResult(raceId, { live: focused });
  const history = useHistory({ live: focused });
  const drivers = useDrivers();
  const { refetch: refetchResult } = result;
  const { refetch: refetchHistory } = history;
  useFocusEffect(
    useCallback(() => {
      void refetchResult();
      void refetchHistory();
    }, [refetchResult, refetchHistory]),
  );
  const prediction = history.data?.find((entry) => entry.raceId === raceId);
  const retry = () => {
    void refetchResult();
    void refetchHistory();
  };
  const failed = result.error || history.error;
  const offline = result.fetchStatus === 'paused' || history.fetchStatus === 'paused';
  const exact =
    prediction && result.data
      ? prediction.predictedOrder.filter((code, index) => result.data?.actualOrder[index] === code)
          .length
      : null;

  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-sm font-semibold text-muted">
        Results
      </Text>
      {(failed || offline) && (
        <View className="gap-3">
          <Text accessibilityRole="alert" className="text-sm text-muted">
            {offline
              ? "You're offline. Connect to refresh results and points."
              : "Couldn't load the latest results or points."}
          </Text>
          <ActionButton
            secondary
            label="Retry results"
            disabled={offline || result.isFetching || history.isFetching}
            onPress={retry}
          />
        </View>
      )}
      {result.data ? (
        <DriverRows
          picks={result.data.actualOrder.slice(0, 5).map((code) => ({
            code,
            team: drivers.data?.find((driver) => driver.code === code)?.team,
          }))}
        />
      ) : result.data === null ? (
        <Text className="text-sm text-muted">
          Results pending. They will appear after the race has been graded.
        </Text>
      ) : !result.error && result.fetchStatus !== 'paused' ? (
        <View
          accessibilityLabel="Loading race results"
          accessibilityState={{ busy: true }}
          className="gap-3"
        >
          {[0, 1, 2, 3, 4].map((index) => (
            <View key={index} className="h-11 rounded-xl bg-raised" />
          ))}
        </View>
      ) : null}
      {prediction ? (
        <View className="gap-1 rounded-2xl bg-accent-deep p-4">
          <Text className="text-base font-semibold text-on-accent">
            {exact === null ? 'Your prediction' : `Your prediction: ${exact}/5 exact positions`}
          </Text>
          <Text className="text-sm text-on-accent">
            {prediction.points === null
              ? 'Points pending'
              : `${prediction.points} points this race`}
          </Text>
        </View>
      ) : history.data !== undefined ? (
        <Text className="text-sm text-muted">No prediction was submitted for this race.</Text>
      ) : !history.error && history.fetchStatus !== 'paused' ? (
        <Text className="text-sm text-muted">Loading your points…</Text>
      ) : null}
    </View>
  );
}
