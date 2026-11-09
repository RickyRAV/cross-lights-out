import { Link } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ActionButton } from '@/components/race-ui';
import { PredictionSummary } from '@/components/prediction-summary';
import { useClock } from '@/hooks/use-clock';
import { useRaces } from '@/hooks/use-races';
import { countdownParts, latestClosedRace, nextRace } from '@/lib/race-calendar';
import colors from '@/theme/colors';

export default function PredictScreen() {
  const { data, error, isFetching, fetchStatus, refetch } = useRaces();
  const now = useClock();
  const race = data ? nextRace(data, now) : null;
  const closedRace = data ? latestClosedRace(data, now) : null;
  const offline = fetchStatus === 'paused';
  const retry = () => {
    void refetch();
  };

  if (data === undefined) {
    if (error || offline) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
          <Text accessibilityRole="alert" className="text-center text-xl font-bold text-foreground">
            {offline ? "You're offline" : "Couldn't load race data"}
          </Text>
          <Text className="text-center text-base text-muted">
            Check your connection and try again.
          </Text>
          <ActionButton
            label={isFetching ? 'Retrying…' : 'Retry'}
            secondary
            onPress={retry}
            disabled={isFetching || offline}
          />
        </View>
      );
    }
    return (
      <View
        accessibilityLabel="Loading race calendar"
        accessibilityState={{ busy: true }}
        className="flex-1 gap-4 bg-background p-5"
      >
        <Text className="text-sm text-muted">Loading next race…</Text>
        <View className="h-40 rounded-2xl bg-raised" />
        <View className="h-12 rounded-xl bg-raised" />
        <View className="h-12 rounded-xl bg-raised" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={retry}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View className="gap-6 p-5">
        {(error || offline) && (
          <View className="gap-3 rounded-xl border border-border p-4">
            <Text accessibilityRole="alert" className="text-sm text-muted">
              {offline
                ? "You're offline. Showing the last loaded calendar."
                : "Couldn't refresh. Showing the last loaded calendar."}
            </Text>
            <ActionButton
              label={isFetching ? 'Retrying…' : 'Retry'}
              secondary
              onPress={retry}
              disabled={isFetching || offline}
            />
          </View>
        )}
        {race ? (
          <>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-muted">Next race</Text>
              <Text
                accessibilityRole="header"
                selectable
                className="text-3xl font-bold text-foreground"
              >
                {race.name}
              </Text>
              <Text selectable className="text-base text-muted">
                {race.circuit}
              </Text>
            </View>
            <View className="gap-4 rounded-2xl bg-surface p-5">
              <Text className="text-sm font-semibold text-muted">Time until predictions close</Text>
              <View className="flex-row flex-wrap gap-5">
                {countdownParts(race.lockoutAt, now).map((part) => (
                  <View key={part.label} className="gap-1">
                    <Text className="text-3xl font-bold tabular-nums text-foreground">
                      {String(part.value).padStart(2, '0')}
                    </Text>
                    <Text className="text-xs text-muted">{part.label}</Text>
                  </View>
                ))}
              </View>
              <Text selectable className="text-sm leading-5 text-muted">
                Predictions close: {new Date(race.lockoutAt).toLocaleString()}
              </Text>
            </View>
            <PredictionSummary key={race.raceId} race={race} />
            <Link href="/race-detail" asChild>
              <Pressable
                accessibilityRole="link"
                className="min-h-12 items-center justify-center rounded-xl border border-border px-5 py-3"
              >
                <Text className="text-lg font-semibold text-accent">View race details</Text>
              </Pressable>
            </Link>
          </>
        ) : (
          <View className="gap-4 py-12">
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
        {closedRace && <PredictionSummary key={closedRace.raceId} race={closedRace} closed />}
      </View>
    </ScrollView>
  );
}
