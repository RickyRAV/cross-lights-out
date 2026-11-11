import type { RaceResponse } from '@lightsout/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuthStore } from '@/store/auth';

// Present mode shortens this so the reminder shows up during a demo.
const leadMinutes = Number(process.env.EXPO_PUBLIC_REMINDER_LEAD_MINUTES ?? 60);
export const REMINDER_LEAD_MS = leadMinutes * 60 * 1000;
const leadText = leadMinutes === 60 ? '1 hour' : `${leadMinutes} minutes`;
const CHANNEL_ID = 'lockout-reminders';
const ID_PREFIX = 'lockout-';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let channel: Promise<string | undefined> | undefined;
let pending: Promise<void> = Promise.resolve();

function inOrder(task: () => Promise<void>): Promise<void> {
  pending = pending.then(task, task);
  return pending;
}

export function prepareReminderChannel(): Promise<string | undefined> {
  if (Platform.OS !== 'android') return Promise.resolve(undefined);
  channel ??= Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lockout reminders',
    importance: Notifications.AndroidImportance.HIGH,
  })
    .then(() => CHANNEL_ID)
    // Expo Go on Android rejects custom channels, so reminders use the default channel there.
    .catch(() => undefined);
  return channel;
}

async function cancelReminders(keep?: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(({ identifier }) => identifier.startsWith(ID_PREFIX) && identifier !== keep)
      .map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)),
  );
}

export function cancelLockoutReminders() {
  return inOrder(() => cancelReminders());
}

export function scheduleLockoutReminder(race: RaceResponse, now: number, unsent: boolean) {
  return inOrder(async () => {
    const fireAt = Date.parse(race.lockoutAt) - REMINDER_LEAD_MS;
    if (!(fireAt > now)) {
      await cancelReminders();
      return;
    }

    const identifier = `${ID_PREFIX}${race.raceId}`;
    await cancelReminders(identifier);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: unsent
        ? {
            title: 'Your prediction has not been sent yet',
            body: `Your ${race.name} prediction is still waiting for a connection. Open Lights Out online before predictions close in ${leadText}.`,
            data: { raceId: race.raceId },
          }
        : {
            title: `Predictions close in ${leadText}`,
            body: `Lock in your top 5 for the ${race.name} before it's too late.`,
            data: { raceId: race.raceId },
          },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireAt),
        channelId: await prepareReminderChannel(),
      },
    });
  });
}

useAuthStore.subscribe((state, previous) => {
  if (previous.status === 'signedIn' && state.status === 'signedOut') {
    void cancelLockoutReminders().catch(() => undefined);
  }
});
