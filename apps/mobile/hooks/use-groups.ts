import {
  groupListResponseSchema,
  groupResponseSchema,
  type CreateGroupRequest,
  type GroupResponse,
  type JoinGroupRequest,
} from '@lightsout/shared';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export const myGroupsQuery = queryOptions({
  queryKey: ['groups', 'mine'],
  queryFn: ({ signal }) => apiRequest('/groups', groupListResponseSchema, { signal }),
});

export function useMyGroup({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    ...myGroupsQuery,
    enabled,
    select: (groups): GroupResponse | null => groups[0] ?? null,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGroupRequest) =>
      apiRequest('/groups', groupResponseSchema, { method: 'POST', body }),
    onSuccess: (group) => queryClient.setQueryData(myGroupsQuery.queryKey, [group]),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: JoinGroupRequest) =>
      apiRequest('/groups/join', groupResponseSchema, { method: 'POST', body }),
    onSuccess: (group) => queryClient.setQueryData(myGroupsQuery.queryKey, [group]),
  });
}
