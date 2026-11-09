import type { RaceResponse } from '@lightsout/shared';
import { Link, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { ActionButton, DriverRows, StatusPill } from '@/components/race-ui';
import { useMyPrediction } from '@/hooks/use-predictions';
import { useDrivers } from '@/hooks/use-drivers';
import { countdownParts } from '@/lib/race-calendar';
import { usePredictionDraftStore } from '@/store/prediction-draft';
import colors from '@/theme/colors';

export function PredictionSummary({
  race,
  now,
  closed = false,
}: {
  race: RaceResponse;
  now: number;
  closed?: boolean;
}) {
  const prediction = useMyPrediction(race.raceId);
  const drivers = useDrivers();
  const draft = usePredictionDraftStore((state) => state.drafts[race.raceId]);
  const open = () => router.push({ pathname: '/prediction', params: { raceId: race.raceId } });
  const saved = prediction.data;
  const picks = saved?.predictedOrder ?? (closed ? [] : (draft ?? []));

  if (closed && saved === null) return null;

  return (
    <View>
      <RaceHero race={race} now={now} submitted={!!saved} closed={closed} />
      <View className="px-5 pt-5">
        <View className="min-h-6 flex-row flex-wrap items-center justify-between gap-2">
          <Text className="text-xs font-semibold text-muted">
            {closed ? 'Your locked picks' : 'Your top 5'}
          </Text>
          {saved && !closed && <StatusPill label="Submitted" />}
        </View>
        {saved === undefined ? (
          <View className="gap-3 py-4">
            <Text className="text-[13px] text-muted">
              {prediction.error
                ? "Couldn't load your prediction."
                : prediction.fetchStatus === 'paused'
                  ? "You're offline. Connect to load your prediction."
                  : 'Loading your prediction…'}
            </Text>
            {prediction.error || prediction.fetchStatus === 'paused' ? (
              <ActionButton
                secondary
                label="Retry prediction"
                disabled={prediction.isFetching || prediction.fetchStatus === 'paused'}
                onPress={() => {
                  void prediction.refetch();
                }}
              />
            ) : (
              <View
                accessibilityLabel="Loading prediction"
                accessibilityState={{ busy: true }}
                className="gap-4"
              >
                {[0, 1, 2, 3, 4].map((index) => (
                  <View key={index} className="h-11 rounded-[10px] bg-raised" />
                ))}
              </View>
            )}
          </View>
        ) : picks.length > 0 ? (
          <DriverRows
            picks={picks.map((code) => ({
              code,
              team: drivers.data?.find((driver) => driver.code === code)?.team,
            }))}
            onPress={!saved && !closed ? open : undefined}
          />
        ) : closed ? (
          <Text className="py-5 text-[13px] leading-5 text-muted">
            No prediction was submitted for this race.
          </Text>
        ) : (
          <View>
            {[0, 1, 2, 3, 4].map((index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Choose driver for position ${index + 1}`}
                onPress={open}
                className={`min-h-[81px] flex-row items-center gap-3 py-4 ${index < 4 ? 'border-b border-border' : ''}`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full border border-border">
                  <Text className="text-xs text-muted">{index + 1}</Text>
                </View>
                <Text className="text-[15px] text-muted">Choose a driver</Text>
              </Pressable>
            ))}
          </View>
        )}
        {!saved && !closed && picks.length > 0 && picks.length < 5 && (
          <Pressable
            accessibilityRole="button"
            onPress={open}
            className="min-h-12 justify-center py-3"
          >
            <Text className="text-sm font-semibold text-accent">
              Choose {5 - picks.length} more {picks.length === 4 ? 'driver' : 'drivers'}
            </Text>
          </Pressable>
        )}
        {prediction.error && saved !== undefined && (
          <View className="gap-3 pb-4">
            <Text accessibilityRole="alert" className="text-[13px] text-muted">
              Couldn't refresh your prediction. Showing the last saved picks.
            </Text>
            <ActionButton
              secondary
              label="Retry prediction"
              disabled={prediction.isFetching || prediction.fetchStatus === 'paused'}
              onPress={() => {
                void prediction.refetch();
              }}
            />
          </View>
        )}
      </View>
      {saved !== undefined && (
        <View className="px-5 pb-6">
          {closed ? (
            <Link href={{ pathname: '/race-detail', params: { raceId: race.raceId } }} asChild>
              <Pressable
                accessibilityRole="link"
                className="min-h-12 items-center justify-center rounded-[14px] bg-accent px-5 py-3.5"
              >
                <Text className="text-[15px] font-semibold text-on-accent">View race detail</Text>
              </Pressable>
            </Link>
          ) : (
            <ActionButton
              secondary={!!saved}
              label={
                saved
                  ? 'Change prediction'
                  : picks.length === 5
                    ? 'Review prediction'
                    : 'Pick your top 5'
              }
              onPress={open}
            />
          )}
        </View>
      )}
    </View>
  );
}

function RaceHero({
  race,
  now,
  submitted,
  closed,
}: {
  race: RaceResponse;
  now: number;
  submitted: boolean;
  closed: boolean;
}) {
  const parts = countdownParts(race.lockoutAt, now).slice(0, 3);
  return (
    <Link href={{ pathname: '/race-detail', params: { raceId: race.raceId } }} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`View details for ${race.name}, ${race.circuit}`}
        className={`gap-1.5 px-5 ${submitted || closed ? 'py-5' : 'py-3.5'} ${closed ? 'bg-surface' : 'bg-accent-deep'}`}
        style={
          closed
            ? undefined
            : {
                experimental_backgroundImage: `linear-gradient(180deg, ${colors['accent-deep']} 40%, ${colors.background} 100%)`,
              }
        }
      >
        <Text className="text-[11px] font-semibold text-muted">
          {closed ? 'Predictions locked' : 'Next race'}
        </Text>
        <Text accessibilityRole="header" className="text-[22px] font-bold text-foreground">
          {race.name}
        </Text>
        <Text className="text-[13px] text-muted">
          {new Date(race.lockoutAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
        {closed ? (
          <Text className="text-[13px] text-muted">Results after the session ends</Text>
        ) : submitted ? (
          <Text className="text-[13px] text-muted">
            Locks in {parts[0].value}d {parts[1].value}h {parts[2].value}m
          </Text>
        ) : (
          <View
            accessibilityLabel={parts.map((part) => `${part.value} ${part.label}`).join(', ')}
            className="flex-row flex-wrap gap-[18px] pt-1.5"
          >
            {parts.map((part) => (
              <View key={part.label} className="gap-1">
                <Text className="text-[34px] font-bold tabular-nums text-foreground">
                  {String(part.value).padStart(2, '0')}
                </Text>
                <Text className="text-[11px] text-muted">{part.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    </Link>
  );
}
