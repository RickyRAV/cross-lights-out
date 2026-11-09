import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { FullScreenError, StaleDataBanner } from '@/components/screen-status';
import { StandingRow } from '@/components/standing-row';
import { useMe } from '@/hooks/use-auth';
import { useMyGroup } from '@/hooks/use-groups';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useOnline } from '@/hooks/use-online';
import { rankEntries } from '@/lib/leaderboard';
import colors from '@/theme/colors';

export default function LeaderboardScreen() {
  const group = useMyGroup();
  const me = useMe();
  const { data, dataUpdatedAt, error, isFetching, fetchStatus, refetch } = useLeaderboard(
    group.data?.id,
  );
  const online = useOnline();
  const offline = fetchStatus === 'paused' || !online;
  const [pulling, setPulling] = useState(false);
  const retry = () => {
    void refetch();
  };
  const pullToRefresh = async () => {
    setPulling(true);
    await refetch();
    setPulling(false);
  };

  if (data === undefined) {
    if (error || offline) {
      return (
        <FullScreenError
          title="Couldn't load the leaderboard"
          offline={offline}
          retrying={isFetching}
          onRetry={retry}
        />
      );
    }
    return (
      <View
        accessibilityLabel="Loading leaderboard"
        accessibilityState={{ busy: true }}
        className="flex-1 gap-3 bg-background p-5"
      >
        <Text className="text-sm text-muted">Loading standings…</Text>
        <View className="h-16 rounded-xl bg-raised" />
        <View className="h-16 rounded-xl bg-raised" />
        <View className="h-16 rounded-xl bg-raised" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pb-6"
      contentInsetAdjustmentBehavior="automatic"
      data={rankEntries(data)}
      keyExtractor={(entry) => entry.userId}
      refreshControl={
        <RefreshControl
          refreshing={pulling && isFetching}
          onRefresh={pullToRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      ListHeaderComponent={
        <View className="gap-4 pb-2 pt-4">
          {group.data && (
            <Text selectable className="text-[13px] text-muted">
              {group.data.name}
            </Text>
          )}
          {(error || offline) && (
            <StaleDataBanner
              what="standings"
              updatedAt={dataUpdatedAt}
              offline={offline}
              retrying={isFetching}
              onRetry={retry}
            />
          )}
        </View>
      }
      ItemSeparatorComponent={() => <View className="h-px bg-border" />}
      renderItem={({ item }) => <StandingRow entry={item} isMe={item.userId === me.data?.id} />}
    />
  );
}
