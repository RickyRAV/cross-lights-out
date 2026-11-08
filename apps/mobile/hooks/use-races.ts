import { raceListResponseSchema, raceResultResponseSchema } from '@lightsout/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiRequest, nullIfNotFound } from '@/lib/api';

export const racesQuery = queryOptions({
  queryKey: ['races', 'calendar'],
  queryFn: ({ signal }) => apiRequest('/races', raceListResponseSchema, { signal }),
  staleTime: 60 * 60_000,
});

export function raceResultQuery(raceId: string) {
  return queryOptions({
    queryKey: ['races', 'result', raceId],
    queryFn: ({ signal }) =>
      apiRequest(`/races/${raceId}/result`, raceResultResponseSchema, { signal }).catch(
        nullIfNotFound,
      ),
  });
}

export function useRaces() {
  return useQuery(racesQuery);
}

export function useRaceResult(raceId: string) {
  return useQuery(raceResultQuery(raceId));
}
