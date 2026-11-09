import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useClock } from '@/hooks/use-clock';
import { myPredictionQuery, useQueuedPrediction } from '@/hooks/use-predictions';
import { useRaces } from '@/hooks/use-races';
import { nextRace } from '@/lib/race-calendar';
import {
  cancelLockoutReminders,
  prepareReminderChannel,
  scheduleLockoutReminder,
} from '@/lib/reminders';

export type ReminderPermission = 'granted' | 'askable' | 'blocked';

const PROMPT_HANDLED_KEY = 'lightsout.reminderPromptHandled';

function toReminderPermission(
  response: Notifications.NotificationPermissionsStatus,
): ReminderPermission {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'askable' : 'blocked';
}

export const reminderPermissionQuery = queryOptions({
  queryKey: ['reminders', 'permission'],
  queryFn: async () => toReminderPermission(await Notifications.getPermissionsAsync()),
  networkMode: 'always',
  staleTime: 0,
});

export const reminderPromptHandledQuery = queryOptions({
  queryKey: ['reminders', 'prompt-handled'],
  queryFn: async () => (await SecureStore.getItemAsync(PROMPT_HANDLED_KEY)) === 'true',
  networkMode: 'always',
  staleTime: Infinity,
});

export function useReminderPermission() {
  return useQuery(reminderPermissionQuery);
}

export function useReminderPromptHandled() {
  return useQuery(reminderPromptHandledQuery);
}

export function useRequestReminderPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await prepareReminderChannel();
      return toReminderPermission(await Notifications.requestPermissionsAsync());
    },
    networkMode: 'always',
    onSuccess: (permission) =>
      queryClient.setQueryData(reminderPermissionQuery.queryKey, permission),
  });
}

export function useMarkReminderPromptHandled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => SecureStore.setItemAsync(PROMPT_HANDLED_KEY, 'true'),
    networkMode: 'always',
    onSettled: () => queryClient.setQueryData(reminderPromptHandledQuery.queryKey, true),
  });
}

export function useLockoutReminder() {
  const permission = useReminderPermission();
  const races = useRaces();
  const now = useClock();
  const race = races.data ? nextRace(races.data, now) : null;
  const prediction = useQuery({
    ...myPredictionQuery(race?.raceId ?? ''),
    enabled: race !== null,
  });

  const queued = useQueuedPrediction(race?.raceId);

  const granted = permission.data === 'granted';
  const predictionKnown = race === null || prediction.data !== undefined;
  const predicted = prediction.data != null;
  const unsent = queued?.state === 'waiting';

  useEffect(() => {
    if (permission.data === undefined || races.data === undefined || !predictionKnown) return;
    const sync =
      granted && race && (unsent || !predicted)
        ? scheduleLockoutReminder(race, Date.now(), unsent)
        : cancelLockoutReminders();
    void sync.catch(() => undefined);
  }, [permission.data, races.data, granted, predictionKnown, predicted, unsent, race]);
}
