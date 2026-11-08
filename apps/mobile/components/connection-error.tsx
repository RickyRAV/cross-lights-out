import { Text, View } from 'react-native';
import { ActionButton } from '@/components/race-ui';

export function ConnectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-10">
      <Text accessibilityRole="header" className="text-center text-lg font-bold text-foreground">
        Couldn&apos;t reach Lights Out
      </Text>
      <Text className="text-center text-[13px] text-muted">
        Check your connection and try again.
      </Text>
      <ActionButton label="Retry" onPress={onRetry} />
    </View>
  );
}
