import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/race-ui';
import { PredictionSummary } from '@/components/prediction-summary';
import { StaleDataBanner } from '@/components/screen-status';
import { useClock } from '@/hooks/use-clock';
import { useOnline } from '@/hooks/use-online';
import { useRaces } from '@/hooks/use-races';
import { myPredictionQuery, useQueuedPrediction } from '@/hooks/use-predictions';
import { latestClosedRace, nextRace } from '@/lib/race-calendar';
import colors from '@/theme/colors';

export default function PredictScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <PredictContent />
    </SafeAreaView>
  );
}

function PredictContent() {
  const { data, dataUpdatedAt, error, isFetching, fetchStatus, refetch } = useRaces();
  const queryClient = useQueryClient();
  const now = useClock();
  const race = data ? nextRace(data, now) : null;
  const closedRace = data ? latestClosedRace(data, now) : null;
  const missedClosedRace = useQueuedPrediction(closedRace?.raceId)?.state === 'missed';
  const online = useOnline();
  const offline = fetchStatus === 'paused' || !online;
  const [pulling, setPulling] = useState(false);
  const retry = () => {
    void refetch();
  };
  const refresh = async () => {
    setPulling(true);
    try {
      await Promise.all([
        refetch(),
        ...[race, closedRace]
          .filter((item) => item !== null)
          .map((item) =>
            queryClient.invalidateQueries({ queryKey: myPredictionQuery(item.raceId).queryKey }),
          ),
      ]);
    } finally {
      setPulling(false);
    }
  };

  if (data === undefined) {
    if (error || offline)
      return (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Text className="text-[32px] text-accent">⚠</Text>
          <Text
            accessibilityRole="alert"
            className="text-center text-[17px] font-semibold text-foreground"
          >
            {offline ? "You're offline" : "Couldn't load race data"}
          </Text>
          <Text className="text-center text-[13px] text-muted">
            Check your connection and try again.
          </Text>
          <ActionButton
            label={isFetching ? 'Retrying…' : 'Retry'}
            onPress={retry}
            disabled={isFetching || offline}
          />
        </View>
      );
    return (
      <View
        accessibilityLabel="Loading race calendar"
        accessibilityState={{ busy: true }}
        className="gap-4 p-5"
      >
        <View className="h-[150px] rounded-2xl bg-raised" />
        {[0, 1, 2, 3, 4].map((index) => (
          <View key={index} className="h-11 rounded-[10px] bg-raised" />
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={pulling && isFetching}
          onRefresh={() => {
            void refresh();
          }}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {missedClosedRace && closedRace && (
        <View className="px-5 pt-5">
          <Text
            accessibilityRole="alert"
            className="rounded-xl border border-accent p-4 text-[13px] leading-5 text-accent"
          >
            Your {closedRace.name} prediction didn't count because you were offline until after
            lockout.
          </Text>
        </View>
      )}
      {(error || offline) && (
        <View className="p-5">
          <StaleDataBanner
            what="calendar"
            updatedAt={dataUpdatedAt}
            offline={offline}
            retrying={isFetching}
            onRetry={retry}
          />
        </View>
      )}
      {race ? (
        <PredictionSummary key={race.raceId} race={race} now={now} />
      ) : (
        <View className="gap-4 px-5 py-12">
          <Text
            accessibilityRole="header"
            className="text-center text-xl font-bold text-foreground"
          >
            No upcoming races
          </Text>
          <Text className="text-center text-base leading-6 text-muted">
            There are no open prediction windows in the current calendar. Pull down to check for
            updates.
          </Text>
        </View>
      )}
      {closedRace && (
        <PredictionSummary key={closedRace.raceId} race={closedRace} now={now} closed />
      )}
    </ScrollView>
  );
}
