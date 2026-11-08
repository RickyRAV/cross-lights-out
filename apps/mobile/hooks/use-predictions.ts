import {
  groupRacePredictionsResponseSchema,
  predictionResponseSchema,
  type SubmitPredictionRequest,
} from '@lightsout/shared';
import {
  queryOptions,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { historyQuery } from '@/hooks/use-history';
import { apiRequest, nullIfNotFound } from '@/lib/api';
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

export function useGroupPredictions(groupId: string | undefined, raceId: string) {
  return useQuery(groupPredictionsQuery(groupId, raceId));
}

export function useSubmitPrediction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitPredictionRequest) =>
      apiRequest('/predictions', predictionResponseSchema, { method: 'POST', body }),
    onSuccess: (prediction) => {
      queryClient.setQueryData(myPredictionQuery(prediction.raceId).queryKey, prediction);
      usePredictionDraftStore.getState().clearDraft(prediction.raceId);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: groupPredictionsKey }),
        queryClient.invalidateQueries({ queryKey: historyQuery.queryKey }),
      ]);
    },
  });
}
