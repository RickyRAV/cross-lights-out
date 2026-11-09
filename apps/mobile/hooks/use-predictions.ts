import {
  groupRacePredictionsResponseSchema,
  predictionResponseSchema,
  type PredictionResponse,
  type SubmitPredictionRequest,
} from '@lightsout/shared';
import {
  mutationOptions,
  queryOptions,
  skipToken,
  useMutation,
  useMutationState,
  useQuery,
  type MutationState,
} from '@tanstack/react-query';
import { historyQuery } from '@/hooks/use-history';
import { racesQuery } from '@/hooks/use-races';
import { ApiError, apiRequest, nullIfNotFound } from '@/lib/api';
import { usePredictionDraftStore } from '@/store/prediction-draft';

const groupPredictionsKey = ['predictions', 'group'] as const;

export function myPredictionQuery(raceId: string) {
  return queryOptions({
    queryKey: ['predictions', 'mine', raceId],
    queryFn: ({ signal }) =>
      apiRequest(`/predictions/${raceId}`, predictionResponseSchema, { signal }).catch(
        nullIfNotFound,
      ),
  });
}

export function groupPredictionsQuery(groupId: string | undefined, raceId: string) {
  return queryOptions({
    queryKey: [...groupPredictionsKey, groupId, raceId],
    queryFn: groupId
      ? ({ signal }) =>
          apiRequest(
            `/groups/${groupId}/races/${raceId}/predictions`,
            groupRacePredictionsResponseSchema,
            { signal },
          )
      : skipToken,
  });
}

export function useMyPrediction(raceId: string) {
  return useQuery(myPredictionQuery(raceId));
}

export function useGroupPredictions(
  groupId: string | undefined,
  raceId: string,
  { live = false }: { live?: boolean } = {},
) {
  return useQuery({
    ...groupPredictionsQuery(groupId, raceId),
    refetchInterval: live ? 15_000 : false,
    refetchIntervalInBackground: false,
  });
}

export const submitPredictionKey = ['predictions', 'submit'] as const;

export function isLockedError(error: unknown) {
  return error instanceof ApiError && error.code === 'PredictionsLocked';
}

export const submitPredictionMutation = mutationOptions({
  mutationKey: submitPredictionKey,
  scope: { id: 'predictions-submit' },
  gcTime: Infinity,
  mutationFn: (body: SubmitPredictionRequest, { client }) => {
    const race = client
      .getQueryData(racesQuery.queryKey)
      ?.find((item) => item.raceId === body.raceId);
    if (race && Date.now() >= Date.parse(race.lockoutAt)) {
      throw new ApiError(409, 'PredictionsLocked', 'Predictions are locked for this race');
    }
    return apiRequest('/predictions', predictionResponseSchema, { method: 'POST', body });
  },
  onSuccess: (prediction, _body, _onMutateResult, { client }) => {
    client.setQueryData(myPredictionQuery(prediction.raceId).queryKey, prediction);
    usePredictionDraftStore.getState().clearDraft(prediction.raceId);
    return Promise.all([
      client.invalidateQueries({ queryKey: groupPredictionsKey }),
      client.invalidateQueries({ queryKey: historyQuery.queryKey }),
    ]);
  },
});

export function useSubmitPrediction() {
  return useMutation(submitPredictionMutation);
}

type SubmissionState = MutationState<PredictionResponse, Error, SubmitPredictionRequest>;

export type QueuedPrediction = {
  state: 'waiting' | 'missed';
  predictedOrder: string[];
};

export function useQueuedPrediction(raceId: string | undefined): QueuedPrediction | null {
  const submissions = useMutationState({
    filters: {
      mutationKey: submitPredictionKey,
      predicate: (mutation) =>
        (mutation.state.variables as SubmitPredictionRequest | undefined)?.raceId === raceId,
    },
    select: (mutation) => mutation.state as SubmissionState,
  });
  const latest = submissions.at(-1);
  if (raceId === undefined || !latest?.variables) return null;
  if (latest.status === 'pending') {
    return { state: 'waiting', predictedOrder: latest.variables.predictedOrder };
  }
  if (latest.status === 'error' && isLockedError(latest.error)) {
    return { state: 'missed', predictedOrder: latest.variables.predictedOrder };
  }
  return null;
}
