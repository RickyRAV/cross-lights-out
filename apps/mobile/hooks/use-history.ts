import { historyResponseSchema } from '@lightsout/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export const historyQuery = queryOptions({
  queryKey: ['history'],
  queryFn: ({ signal }) => apiRequest('/users/me/history', historyResponseSchema, { signal }),
});

export function useHistory({ live = false }: { live?: boolean } = {}) {
  return useQuery({
    ...historyQuery,
    refetchInterval: (query) =>
      live && query.state.data?.some((entry) => entry.points === null) ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
}
