import { leaderboardResponseSchema } from '@lightsout/shared';
import { queryOptions, skipToken, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export function leaderboardQuery(groupId: string | undefined) {
  return queryOptions({
    queryKey: ['leaderboard', groupId],
    queryFn: groupId
      ? ({ signal }) =>
          apiRequest(`/groups/${groupId}/leaderboard`, leaderboardResponseSchema, { signal })
      : skipToken,
  });
}

export function useLeaderboard(groupId: string | undefined) {
  return useQuery(leaderboardQuery(groupId));
}
