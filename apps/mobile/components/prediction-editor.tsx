import { submitPredictionRequestSchema, type RaceResponse } from '@lightsout/shared';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { PredictionConfirmation } from '@/components/prediction-confirmation';
import { ActionButton, DriverChip, DriverRows, StatusPill } from '@/components/race-ui';
import { useClock } from '@/hooks/use-clock';
import { useDrivers } from '@/hooks/use-drivers';
import { useMyPrediction, useSubmitPrediction } from '@/hooks/use-predictions';
import { ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/form-errors';
import { usePredictionDraftStore } from '@/store/prediction-draft';

export function PredictionEditor({ race }: { race: RaceResponse }) {
  const prediction = useMyPrediction(race.raceId);
  const drivers = useDrivers();
  const submission = useSubmitPrediction();
  const now = useClock();
  const [serverLocked, setServerLocked] = useState(false);
  const [confirmation, setConfirmation] = useState<string[] | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const submitting = useRef(false);
  const draft = usePredictionDraftStore((state) => state.drafts[race.raceId]);
  const picks = draft ?? prediction.data?.predictedOrder ?? [];
  const unchanged =
    !!prediction.data &&
    picks.length === prediction.data.predictedOrder.length &&
    picks.every((code, index) => code === prediction.data?.predictedOrder[index]);
  const deadline = Date.parse(race.lockoutAt);
  const locked = serverLocked || now >= deadline;
  const busy = submission.isPending;

  const update = (order: string[]) => {
    if (locked || busy) return;
    submission.reset();
    setValidationError(null);
    usePredictionDraftStore.getState().setDraft(race.raceId, order);
  };

  const toggle = (code: string) => {
    update(
      picks.includes(code)
        ? picks.filter((pick) => pick !== code)
        : picks.length < 5
          ? [...picks, code]
          : picks,
    );
  };

  const move = (index: number, direction: number) => {
    const destination = index + direction;
    if (destination < 0 || destination >= picks.length) return;
    const order = [...picks];
    [order[index], order[destination]] = [order[destination], order[index]];
    update(order);
  };

  const confirm = () => {
    if (busy || confirmation || submitting.current || locked || unchanged) return;
    const body = { raceId: race.raceId, predictedOrder: [...picks] };
    if (!submitPredictionRequestSchema.safeParse(body).success) return;
    if (
      !drivers.data ||
      picks.some((code) => !drivers.data.some((driver) => driver.code === code))
    ) {
      setValidationError(
        'Driver list changed. Remove any unavailable driver and choose another one.',
      );
      return;
    }
    setConfirmation(body.predictedOrder);
  };

  const send = () => {
    if (!confirmation || busy || submitting.current) return;
    if (
      prediction.data &&
      confirmation.length === prediction.data.predictedOrder.length &&
      confirmation.every((code, index) => code === prediction.data?.predictedOrder[index])
    ) {
      setConfirmation(null);
      return;
    }
    if (Date.now() >= deadline || locked) {
      setConfirmation(null);
      setServerLocked(true);
      return;
    }
    if (confirmation.some((code) => !drivers.data?.some((driver) => driver.code === code))) {
      setConfirmation(null);
      setValidationError(
        'Driver list changed. Remove any unavailable driver and choose another one.',
      );
      return;
    }
    submitting.current = true;
    submission.mutate(
      { raceId: race.raceId, predictedOrder: confirmation },
      {
        onSuccess: () => router.back(),
        onError: (error) => {
          setConfirmation(null);
          if (error instanceof ApiError && error.code === 'PredictionsLocked')
            setServerLocked(true);
        },
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  };

  if (prediction.data === undefined || (!locked && drivers.data === undefined)) {
    const failed = prediction.error || (!locked && drivers.error);
    const offline =
      prediction.fetchStatus === 'paused' || (!locked && drivers.fetchStatus === 'paused');
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-lg font-semibold text-foreground">
          {offline
            ? "You're offline"
            : failed
              ? "Couldn't load the prediction builder"
              : 'Loading your prediction…'}
        </Text>
        <Text className="text-center text-sm text-muted">
          {offline
            ? 'Reconnect to load your saved prediction and the driver list.'
            : failed
              ? 'Your draft is kept. Try loading again.'
              : 'Checking saved picks and the season driver list.'}
        </Text>
        {(failed || offline) && (
          <ActionButton
            secondary
            label="Retry"
            disabled={offline || prediction.isFetching || drivers.isFetching}
            onPress={() => {
              void prediction.refetch();
              void drivers.refetch();
            }}
          />
        )}
      </View>
    );
  }

  if (locked)
    return (
      <ScrollView className="flex-1 bg-background" contentInsetAdjustmentBehavior="automatic">
        <View className="gap-4 p-5">
          <Text className="text-xl font-bold text-foreground">{race.name}</Text>
          <Text className="text-sm text-muted">
            Predictions close: {new Date(race.lockoutAt).toLocaleString()}
          </Text>
          <StatusPill label="Predictions locked" variant="score" />
          <Text className="text-sm leading-5 text-muted">
            The prediction window has closed. Submitted picks cannot be edited.
          </Text>
          {prediction.data ? (
            <DriverRows
              picks={prediction.data.predictedOrder.map((code) => ({
                code,
                team: drivers.data?.find((driver) => driver.code === code)?.team,
              }))}
            />
          ) : (
            <Text className="text-base text-foreground">
              No submitted prediction for this race.
            </Text>
          )}
          {draft && (
            <Text className="text-sm text-muted">
              Any unsent draft does not count as a submitted prediction.
            </Text>
          )}
          <ActionButton secondary label="Back to Predict" onPress={() => router.back()} />
        </View>
      </ScrollView>
    );

  const valid =
    submitPredictionRequestSchema.safeParse({ raceId: race.raceId, predictedOrder: picks })
      .success && picks.every((code) => drivers.data?.some((driver) => driver.code === code));
  const submitError =
    submission.error instanceof ApiError && submission.error.code === 'UnknownDriver'
      ? 'One of your drivers is no longer available. Refresh the driver list and update your picks.'
      : apiErrorMessage(submission.error);

  return (
    <>
      <PredictionConfirmation
        drivers={drivers.data}
        order={confirmation}
        raceName={race.name}
        updating={!!prediction.data}
        busy={busy}
        waitingForConnection={submission.isPaused}
        onCancel={() => setConfirmation(null)}
        onConfirm={send}
      />
      <ScrollView className="flex-1 bg-background" contentInsetAdjustmentBehavior="automatic">
        <View className="gap-5 p-5">
          <View className="gap-2">
            <Text className="text-xl font-bold text-foreground">{race.name}</Text>
            <Text className="text-sm leading-5 text-muted">
              Choose five drivers in finishing order. Tap a selected driver to remove them, or use
              the arrows to reorder.
            </Text>
            {prediction.data && (
              <Text className="text-sm text-muted">
                Your saved prediction stays submitted until this update succeeds.
              </Text>
            )}
          </View>
          <Text accessibilityLiveRegion="polite" className="text-sm font-semibold text-muted">
            Your top 5 · {picks.length}/5 selected
          </Text>
          <View className="gap-2">
            {[0, 1, 2, 3, 4].map((index) => (
              <View
                key={index}
                className="min-h-14 flex-row flex-wrap items-center gap-2 rounded-xl bg-surface px-3 py-1"
              >
                <Text className="w-5 text-sm text-muted">{index + 1}.</Text>
                <Text className="flex-1 text-sm font-semibold text-foreground">
                  {picks[index] ?? 'Choose a driver'}
                </Text>
                {picks[index] && (
                  <View className="flex-row">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${picks[index]} up`}
                      accessibilityState={{ disabled: busy || index === 0 }}
                      disabled={busy || index === 0}
                      onPress={() => move(index, -1)}
                      className={`h-11 w-11 items-center justify-center ${busy || index === 0 ? 'opacity-30' : ''}`}
                    >
                      <Text className="text-xl text-accent">↑</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${picks[index]} down`}
                      accessibilityState={{ disabled: busy || index === picks.length - 1 }}
                      disabled={busy || index === picks.length - 1}
                      onPress={() => move(index, 1)}
                      className={`h-11 w-11 items-center justify-center ${busy || index === picks.length - 1 ? 'opacity-30' : ''}`}
                    >
                      <Text className="text-xl text-accent">↓</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${picks[index]}`}
                      disabled={busy}
                      onPress={() => toggle(picks[index])}
                      className="h-11 w-11 items-center justify-center"
                    >
                      <Text className="text-xl text-accent">×</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
          {(prediction.error || drivers.error) && (
            <View className="gap-3">
              <Text accessibilityRole="alert" className="text-sm text-muted">
                Couldn't refresh. Showing the last loaded data; your draft is kept.
              </Text>
              <ActionButton
                secondary
                label="Refresh data"
                disabled={busy || drivers.isFetching || prediction.isFetching}
                onPress={() => {
                  void drivers.refetch();
                  void prediction.refetch();
                }}
              />
            </View>
          )}
          {drivers.data?.length === 0 && (
            <View className="gap-3">
              <Text className="text-sm text-muted">No season drivers are available yet.</Text>
              <ActionButton
                secondary
                label="Refresh drivers"
                disabled={drivers.isFetching}
                onPress={() => {
                  void drivers.refetch();
                }}
              />
            </View>
          )}
          <View className="gap-2.5">
            {Array.from({ length: Math.ceil((drivers.data?.length ?? 0) / 2) }, (_, row) => (
              <View key={row} className="flex-row gap-2.5">
                {drivers.data?.slice(row * 2, row * 2 + 2).map((driver) => {
                  const selected = picks.includes(driver.code);
                  const disabled = busy || (!selected && picks.length === 5);
                  return (
                    <Pressable
                      key={driver.code}
                      accessibilityRole="button"
                      accessibilityLabel={`${driver.name}${selected ? `, position ${picks.indexOf(driver.code) + 1}` : ''}`}
                      accessibilityState={{ selected, disabled }}
                      disabled={disabled}
                      onPress={() => toggle(driver.code)}
                      className={`min-h-16 flex-1 flex-row flex-wrap items-center gap-2 rounded-xl border p-3 ${selected ? 'border-accent bg-accent-deep' : 'border-border bg-raised'} ${disabled && !selected ? 'opacity-40' : ''}`}
                    >
                      <DriverChip code={driver.code} team={driver.team} />
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-semibold text-foreground">{driver.code}</Text>
                        <Text className="text-xs text-muted">{driver.name}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          {validationError && (
            <Text accessibilityRole="alert" className="text-sm text-accent">
              {validationError}
            </Text>
          )}
          {submission.isError && (
            <View className="gap-3">
              <Text accessibilityRole="alert" className="text-sm text-accent">
                {submitError} Your draft is kept.
              </Text>
              <ActionButton
                secondary
                label="Refresh driver list"
                disabled={busy || drivers.isFetching}
                onPress={() => {
                  void drivers.refetch();
                }}
              />
            </View>
          )}
          {submission.isPaused && (
            <Text accessibilityLiveRegion="polite" className="text-sm text-muted">
              Waiting for a connection. Your prediction has not been submitted yet.
            </Text>
          )}
          <ActionButton
            label={
              busy ? 'Submitting…' : prediction.data ? 'Update prediction' : 'Submit prediction'
            }
            accessibilityState={{ busy }}
            disabled={!valid || busy || unchanged}
            onPress={confirm}
          />
          <ActionButton
            secondary
            label="Cancel changes"
            disabled={busy}
            onPress={() => {
              usePredictionDraftStore.getState().clearDraft(race.raceId);
              router.back();
            }}
          />
        </View>
      </ScrollView>
    </>
  );
}
