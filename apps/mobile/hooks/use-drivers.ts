import { driverListResponseSchema } from '@lightsout/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export const driversQuery = queryOptions({
  queryKey: ['drivers'],
  queryFn: ({ signal }) => apiRequest('/drivers', driverListResponseSchema, { signal }),
  staleTime: 60 * 60_000,
});

export function useDrivers() {
  return useQuery(driversQuery);
}
