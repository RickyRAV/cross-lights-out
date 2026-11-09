import { Text, View } from 'react-native';
import { ActionButton } from '@/components/race-ui';

type StatusProps = {
  offline: boolean;
  retrying: boolean;
  onRetry: () => void;
};

export function FullScreenError({
  title,
  offline,
  retrying,
  onRetry,
}: StatusProps & { title: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <Text accessibilityRole="alert" className="text-center text-xl font-bold text-foreground">
        {offline ? "You're offline" : title}
      </Text>
      <Text className="text-center text-base text-muted">Check your connection and try again.</Text>
      <ActionButton
        label={retrying ? 'Retrying…' : 'Retry'}
        secondary
        onPress={onRetry}
        disabled={retrying || offline}
      />
    </View>
  );
}

export function StaleDataBanner({
  what,
  offline,
  retrying,
  onRetry,
}: StatusProps & { what: string }) {
  return (
    <View className="gap-3 rounded-xl border border-border p-4">
      <Text accessibilityRole="alert" className="text-sm text-muted">
        {offline
          ? `You're offline. Showing the last loaded ${what}.`
          : `Couldn't refresh. Showing the last loaded ${what}.`}
      </Text>
      <ActionButton
        label={retrying ? 'Retrying…' : 'Retry'}
        secondary
        onPress={onRetry}
        disabled={retrying || offline}
      />
    </View>
  );
}
