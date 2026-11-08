import { historyResponseSchema } from '@lightsout/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export const historyQuery = queryOptions({
  queryKey: ['history'],
  queryFn: ({ signal }) => apiRequest('/users/me/history', historyResponseSchema, { signal }),
});

export function useHistory() {
  return useQuery(historyQuery);
}
