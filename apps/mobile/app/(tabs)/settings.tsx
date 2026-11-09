import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, Share, Text, View } from 'react-native';
import { ActionButton } from '@/components/race-ui';
import { StaleDataBanner } from '@/components/screen-status';
import { useMe } from '@/hooks/use-auth';
import { useMyGroup } from '@/hooks/use-groups';
import { useReminderPermission } from '@/hooks/use-reminders';
import { useAuthStore } from '@/store/auth';

export default function SettingsScreen() {
  const me = useMe();
  const group = useMyGroup();
  const permission = useReminderPermission();
  const { refetch: refreshPermission } = permission;
  const signOut = useAuthStore((state) => state.signOut);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshPermission();
    }, [refreshPermission]),
  );

  const share = async () => {
    if (!group.data) return;
    setActionError(null);
    try {
      await Share.share({
        message: `Join my Lights Out group "${group.data.name}" with the invite code ${group.data.inviteCode}`,
      });
    } catch {
      setActionError("Couldn't share the invite code. You can select and copy it above.");
    }
  };
  const openNotifications = async () => {
    setActionError(null);
    try {
      await Linking.openSettings();
    } catch {
      setActionError(
        "Couldn't open system settings. Open your device settings to change notification permissions.",
      );
    }
  };
  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await signOut();
    } catch {
      setActionError("Couldn't finish signing out. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-6 p-5">
        <View className="gap-3">
          <Text accessibilityRole="header" className="text-xs font-semibold text-muted">
            Account
          </Text>
          {me.data ? (
            <View className="gap-1 rounded-2xl bg-raised p-4">
              <Text selectable className="text-base font-semibold text-foreground">
                {me.data.displayName}
              </Text>
              <Text selectable className="text-sm text-muted">
                {me.data.email}
              </Text>
            </View>
          ) : !me.error && me.fetchStatus !== 'paused' ? (
            <Text className="text-sm text-muted">Loading account…</Text>
          ) : null}
          {(me.error || me.fetchStatus === 'paused') && (
            <StaleDataBanner
              what="account details"
              offline={me.fetchStatus === 'paused'}
              retrying={me.isFetching}
              onRetry={() => {
                void me.refetch();
              }}
            />
          )}
        </View>

        <View className="gap-3">
          <Text accessibilityRole="header" className="text-xs font-semibold text-muted">
            Friend group
          </Text>
          {group.data ? (
            <View className="gap-4 rounded-2xl bg-raised p-4">
              <Text selectable className="text-base font-semibold text-foreground">
                {group.data.name}
              </Text>
              <View className="gap-1.5">
                <Text className="text-xs text-muted">Invite code</Text>
                <Text
                  selectable
                  accessibilityLabel={`Invite code ${group.data.inviteCode.split('').join(' ')}`}
                  className="text-[22px] font-bold tracking-[3px] text-foreground"
                >
                  {group.data.inviteCode}
                </Text>
              </View>
              <ActionButton
                secondary
                label="Share invite code"
                onPress={() => {
                  void share();
                }}
              />
            </View>
          ) : (
            <Text className="text-sm text-muted">
              {group.data === null ? 'You are not in a friend group.' : 'Loading friend group…'}
            </Text>
          )}
          {(group.error || group.fetchStatus === 'paused') && (
            <StaleDataBanner
              what="group details"
              offline={group.fetchStatus === 'paused'}
              retrying={group.isFetching}
              onRetry={() => {
                void group.refetch();
              }}
            />
          )}
        </View>

        <View className="gap-3">
          <Text accessibilityRole="header" className="text-xs font-semibold text-muted">
            Notifications
          </Text>
          <View className="gap-4 rounded-2xl bg-raised p-4">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-sm font-semibold text-foreground">
                Lockout reminders
              </Text>
              <Text className="text-sm text-muted">
                {permission.data === undefined
                  ? permission.error
                    ? 'Unavailable'
                    : 'Checking…'
                  : permission.data === 'granted'
                    ? 'On'
                    : 'Off'}
              </Text>
            </View>
            <Text className="text-sm leading-5 text-muted">
              Reminders are sent one hour before lockout if you haven't submitted your prediction.
            </Text>
            {permission.error && (
              <ActionButton
                secondary
                label="Retry permission check"
                disabled={permission.isFetching}
                onPress={() => {
                  void refreshPermission();
                }}
              />
            )}
            <ActionButton
              secondary
              label="Open notification settings"
              onPress={() => {
                void openNotifications();
              }}
            />
          </View>
        </View>
        {actionError && (
          <Text accessibilityRole="alert" className="text-sm text-accent">
            {actionError}
          </Text>
        )}
        <ActionButton
          secondary
          label={busy ? 'Signing out…' : 'Sign out'}
          disabled={busy}
          onPress={() => {
            void logout();
          }}
        />
      </View>
    </ScrollView>
  );
}
