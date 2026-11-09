import { Text, View } from 'react-native';
import { AvatarChip } from '@/components/race-ui';
import { chipColor, initials, type RankedEntry } from '@/lib/leaderboard';

export function StandingRow({ entry, isMe }: { entry: RankedEntry; isMe: boolean }) {
  const races = `${entry.racesScored} ${entry.racesScored === 1 ? 'race' : 'races'} scored`;
  return (
    <View
      accessible
      accessibilityLabel={`Rank ${entry.rank}, ${entry.displayName}${isMe ? ', you' : ''}, ${entry.totalPoints} points, ${races}`}
      className="min-h-16 flex-row items-center gap-3 py-3.5"
    >
      <Text className="w-6 text-[15px] font-semibold tabular-nums text-muted">{entry.rank}</Text>
      <AvatarChip
        code={initials(entry.displayName)}
        color={isMe ? 'self' : chipColor(entry.userId)}
      />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-[15px] font-semibold text-foreground">
          {entry.displayName}
        </Text>
        <Text className="text-xs text-muted">{races}</Text>
      </View>
      <View className="items-end">
        <Text className="text-lg font-bold tabular-nums text-foreground">{entry.totalPoints}</Text>
        <Text className="text-[10px] font-semibold text-muted">PTS</Text>
      </View>
    </View>
  );
}
