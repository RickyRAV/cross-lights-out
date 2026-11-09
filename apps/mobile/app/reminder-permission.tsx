import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/race-ui';
import { useMarkReminderPromptHandled, useRequestReminderPermission } from '@/hooks/use-reminders';
import colors from '@/theme/colors';

export default function ReminderPermissionScreen() {
  const insets = useSafeAreaInsets();
  const request = useRequestReminderPermission();
  const markHandled = useMarkReminderPromptHandled();
  const busy = request.isPending || markHandled.isPending;

  const close = () => {
    if (router.canGoBack()) router.back();
  };

  const turnOn = () => {
    if (busy) return;
    request.mutate(undefined, {
      onSettled: () => markHandled.mutate(undefined, { onSettled: close }),
    });
  };

  const notNow = () => {
    if (busy) return;
    markHandled.mutate(undefined, { onSettled: close });
  };

  return (
    <View className="flex-1 justify-end bg-black/60">
      <View
        className="items-center gap-4 rounded-t-3xl bg-raised px-6 pt-7"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <Ionicons name="notifications-outline" size={36} color={colors.accent} />
        <Text accessibilityRole="header" className="text-center text-xl font-bold text-foreground">
          Never miss a lockout
        </Text>
        <Text className="text-center text-sm leading-5 text-muted">
          We&apos;ll send a reminder shortly before predictions close for each race, so you never
          miss your window.
        </Text>
        <View className="w-full gap-3 pt-2">
          <ActionButton
            label={request.isPending ? 'Asking…' : 'Turn on reminders'}
            accessibilityState={{ busy: request.isPending }}
            disabled={busy}
            onPress={turnOn}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={notNow}
            className="min-h-12 items-center justify-center"
          >
            <Text className="text-[15px] font-semibold text-muted">Not now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
