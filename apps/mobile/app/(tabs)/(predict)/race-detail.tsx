import type { RaceResponse } from '@lightsout/shared';
import { Link, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ActionButton, AvatarChip, StatusPill } from '@/components/race-ui';
import { FullScreenError, StaleDataBanner } from '@/components/screen-status';
import { useMe } from '@/hooks/use-auth';
import { useClock } from '@/hooks/use-clock';
import { useMyGroup } from '@/hooks/use-groups';
import { useGroupPredictions } from '@/hooks/use-predictions';
import { useRaces } from '@/hooks/use-races';
import { latestClosedRace, nextRace } from '@/lib/race-calendar';
import { chipColor, initials } from '@/lib/leaderboard';
import colors from '@/theme/colors';

export default function RaceDetailScreen() {
  const { raceId } = useLocalSearchParams<{ raceId?: string | string[] }>();
  const calendar = useRaces();
  const now = useClock();
  const id = typeof raceId === 'string' ? raceId : undefined;
  const race = calendar.data
    ? id
      ? calendar.data.find((item) => item.raceId === id)
      : (nextRace(calendar.data, now) ?? latestClosedRace(calendar.data, now))
    : undefined;

  if (!race && !calendar.data && (calendar.error || calendar.fetchStatus === 'paused')) {
    return (
      <FullScreenError
        title="Couldn't load race details"
        offline={calendar.fetchStatus === 'paused'}
        retrying={calendar.isFetching}
        onRetry={() => {
          void calendar.refetch();
        }}
      />
    );
  }

  if (!race)
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text accessibilityRole="header" className="text-center text-xl font-bold text-foreground">
          {calendar.data
            ? 'Race not found'
            : calendar.error
              ? "Couldn't load race details"
              : calendar.fetchStatus === 'paused'
                ? "You're offline"
                : 'Loading race details…'}
        </Text>
        <ActionButton
          secondary
          label="Retry"
          disabled={calendar.isFetching || calendar.fetchStatus === 'paused'}
          onPress={() => {
            void calendar.refetch();
          }}
        />
      </View>
    );

  return <RaceMembers key={race.raceId} race={race} />;
}

function RaceMembers({ race }: { race: RaceResponse }) {
  const focused = useIsFocused();
  const group = useMyGroup();
  const me = useMe();
  const members = useGroupPredictions(group.data?.id, race.raceId, { live: focused });
  const { refetch } = members;
  const groupId = group.data?.id;
  const now = useClock();
  const closed = now >= Date.parse(race.lockoutAt);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (groupId) void refetch();
    }, [groupId, refetch]),
  );

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([group.refetch(), groupId ? refetch() : Promise.resolve()]);
    } finally {
      setRefreshing(false);
    }
  };

  if (group.data === undefined && (group.error || group.fetchStatus === 'paused')) {
    return (
      <FullScreenError
        title="Couldn't load your friend group"
        offline={group.fetchStatus === 'paused'}
        retrying={group.isFetching}
        onRetry={() => {
          void group.refetch();
        }}
      />
    );
  }

  if (!group.data)
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-lg font-semibold text-foreground">
          {group.data === null
            ? 'Join a friend group to see submission statuses.'
            : group.error
              ? "Couldn't load your friend group"
              : group.fetchStatus === 'paused'
                ? "You're offline"
                : 'Loading your group…'}
        </Text>
        {group.data === null ? (
          <Link href="/onboarding" asChild>
            <Pressable
              accessibilityRole="link"
              className="min-h-12 items-center justify-center px-5"
            >
              <Text className="font-semibold text-accent">Create or join a group</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    );

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void refresh();
          }}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View className="gap-5 p-5">
        <View className="gap-2">
          <Text
            accessibilityRole="header"
            selectable
            className="text-2xl font-bold text-foreground"
          >
            {race.name}
          </Text>
          <Text selectable className="text-sm text-muted">
            {race.circuit}
          </Text>
          <Text selectable className="text-sm text-muted">
            Predictions close: {new Date(race.lockoutAt).toLocaleString()}
          </Text>
        </View>
        <Text className="text-sm font-semibold text-muted">
          {group.data.name} · {closed ? 'Predictions closed' : 'Before lockout'}
        </Text>
        {!closed && (
          <Text className="text-sm leading-5 text-muted">
            Only submission status is shown. Everyone's picks stay hidden before lockout.
          </Text>
        )}
        {members.data === undefined ? (
          members.error || members.fetchStatus === 'paused' ? (
            <FullScreenError
              title="Couldn't load submission statuses"
              offline={members.fetchStatus === 'paused'}
              retrying={members.isFetching}
              onRetry={() => {
                void refetch();
              }}
            />
          ) : (
            <View className="gap-3">
              <Text className="text-sm text-muted">Loading submission statuses…</Text>
              <View
                accessibilityLabel="Loading submission statuses"
                accessibilityState={{ busy: true }}
                className="gap-3"
              >
                <View className="h-14 rounded-xl bg-raised" />
                <View className="h-14 rounded-xl bg-raised" />
              </View>
            </View>
          )
        ) : (
          <>
            {(members.error || members.fetchStatus === 'paused' || group.error) && (
              <StaleDataBanner
                what="submission statuses"
                offline={members.fetchStatus === 'paused' || group.fetchStatus === 'paused'}
                retrying={refreshing || members.isFetching || group.isFetching}
                onRetry={() => {
                  void refresh();
                }}
              />
            )}
            {members.data.length === 0 ? (
              <Text className="text-sm text-muted">
                No group members were returned. Pull down to refresh.
              </Text>
            ) : (
              members.data.map((member, index) => (
                <View
                  key={member.userId}
                  className={`min-h-16 flex-row flex-wrap items-center gap-3 py-3 ${index < members.data.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <AvatarChip
                    code={initials(member.displayName)}
                    color={member.userId === me.data?.id ? 'self' : chipColor(member.userId)}
                  />
                  <Text className="min-w-0 flex-1 text-[15px] font-semibold text-foreground">
                    {member.displayName}
                  </Text>
                  {member.submitted ? (
                    <StatusPill label="Submitted" />
                  ) : (
                    <View className="rounded-full bg-raised px-2.5 py-1">
                      <Text className="text-[11px] font-semibold text-muted">Not submitted</Text>
                    </View>
                  )}
                </View>
              ))
            )}
            <Text className="text-xs text-muted">
              Statuses refresh automatically while this screen is open. Pull down to refresh now.
            </Text>
          </>
        )}
        {!closed && (
          <Link href={{ pathname: '/prediction', params: { raceId: race.raceId } }} asChild>
            <Pressable
              accessibilityRole="link"
              className="min-h-12 items-center justify-center rounded-[14px] bg-accent px-5 py-3.5"
            >
              <Text className="text-[15px] font-semibold text-on-accent">Your prediction</Text>
            </Pressable>
          </Link>
        )}
      </View>
    </ScrollView>
  );
}
