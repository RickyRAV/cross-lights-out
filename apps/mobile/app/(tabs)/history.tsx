import type { HistoryEntry } from '@lightsout/shared';
import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { FullScreenError, StaleDataBanner } from '@/components/screen-status';
import { useHistory } from '@/hooks/use-history';
import { useRaces } from '@/hooks/use-races';
import colors from '@/theme/colors';

export default function HistoryScreen() {
  const focused = useIsFocused();
  const history = useHistory({ live: focused });
  const calendar = useRaces();
  const [pulling, setPulling] = useState(false);
  const offline = history.fetchStatus === 'paused';
  const retry = () => {
    void history.refetch();
    void calendar.refetch();
  };
  const refresh = async () => {
    setPulling(true);
    try {
      await Promise.all([history.refetch(), calendar.refetch()]);
    } finally {
      setPulling(false);
    }
  };

  if (history.data === undefined) {
    if (history.error || offline)
      return (
        <FullScreenError
          title="Couldn't load your history"
          offline={offline}
          retrying={history.isFetching}
          onRetry={retry}
        />
      );
    return (
      <View
        accessibilityLabel="Loading prediction history"
        accessibilityState={{ busy: true }}
        className="flex-1 gap-4 bg-background p-5"
      >
        {[0, 1, 2].map((index) => (
          <View key={index} className="h-16 rounded-xl bg-raised" />
        ))}
      </View>
    );
  }

  const races = new Map(calendar.data?.map((race) => [race.raceId, race]));
  const entries = [...history.data].sort(
    (a, b) =>
      Date.parse(races.get(b.raceId)?.lockoutAt ?? b.submittedAt) -
      Date.parse(races.get(a.raceId)?.lockoutAt ?? a.submittedAt),
  );
  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="grow px-5 pb-6"
      contentInsetAdjustmentBehavior="automatic"
      data={entries}
      keyExtractor={(entry) => entry.raceId}
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={() => {
            void refresh();
          }}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      ListHeaderComponent={
        <View className="gap-3 pt-4">
          <Text className="pb-3 text-[13px] text-muted">Your past predictions</Text>
          {(history.error || offline) && (
            <StaleDataBanner
              what="history"
              offline={offline}
              retrying={history.isFetching}
              onRetry={retry}
            />
          )}
          {calendar.error && (
            <StaleDataBanner
              what="race information"
              offline={calendar.fetchStatus === 'paused'}
              retrying={calendar.isFetching}
              onRetry={retry}
            />
          )}
        </View>
      }
      ListEmptyComponent={
        <View className="gap-3 py-16">
          <Text className="text-center text-lg font-semibold text-foreground">
            No predictions yet
          </Text>
          <Text className="text-center text-sm leading-5 text-muted">
            Submit your top 5 on Predict. Your predictions and results will appear here.
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => <View className="h-px bg-border" />}
      renderItem={({ item }) => (
        <HistoryRow entry={item} name={races.get(item.raceId)?.name ?? item.raceId} />
      )}
    />
  );
}

function HistoryRow({ entry, name }: { entry: HistoryEntry; name: string }) {
  const [expanded, setExpanded] = useState(false);
  const correct = entry.predictedOrder.filter(
    (code, index) => entry.actualOrder?.[index] === code,
  ).length;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${name}, ${entry.points === null ? 'Pending' : `${correct} of 5 exact positions, ${entry.points} points`}`}
        accessibilityHint="Show or hide prediction and result details"
        onPress={() => setExpanded((value) => !value)}
        className="min-h-16 flex-row items-center gap-3 py-3.5"
      >
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-[15px] font-semibold text-foreground">{name}</Text>
          <Text className="text-xs text-muted">{entry.predictedOrder.join(', ')}</Text>
        </View>
        <View
          className={`rounded-full px-3 py-1 ${entry.points === null ? 'bg-raised' : 'bg-accent-deep'}`}
        >
          <Text className="text-[11px] font-semibold tabular-nums text-foreground">
            {entry.points === null ? 'Pending' : `${correct}/5 · +${entry.points}`}
          </Text>
        </View>
      </Pressable>
      {expanded && (
        <View className="flex-row gap-4 pb-5">
          <View className="flex-1 gap-2">
            <Text className="text-xs text-muted">Your top 5</Text>
            {entry.predictedOrder.map((code, index) => (
              <Text selectable key={`${index}-${code}`} className="text-sm text-foreground">
                {index + 1}. {code}
              </Text>
            ))}
          </View>
          <View className="flex-1 gap-2">
            <Text className="text-xs text-muted">Actual top 5</Text>
            {entry.actualOrder === null ? (
              <Text className="text-sm text-muted">Awaiting results</Text>
            ) : (
              entry.actualOrder.map((code, index) => (
                <Text selectable key={`${index}-${code}`} className="text-sm text-foreground">
                  {index + 1}. {code}
                </Text>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}
