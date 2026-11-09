import {
  groupListResponseSchema,
  groupResponseSchema,
  type CreateGroupRequest,
  type GroupResponse,
  type JoinGroupRequest,
} from '@lightsout/shared';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { ApiError, apiRequest } from '@/lib/api';
import { useOnboardingStore } from '@/store/onboarding';

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

function recheckMembership(queryClient: QueryClient, error: Error) {
  const outcomeUnknown =
    !(error instanceof ApiError) ||
    error.status === 0 ||
    error.status >= 500 ||
    error.code === 'AlreadyInGroup';
  if (outcomeUnknown) return queryClient.invalidateQueries({ queryKey: myGroupsQuery.queryKey });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGroupRequest) =>
      apiRequest('/groups', groupResponseSchema, { method: 'POST', body }),
    onSuccess: (group) => {
      useOnboardingStore.getState().showCreatedGroup(group);
      queryClient.setQueryData(myGroupsQuery.queryKey, [group]);
    },
    onError: (error) => recheckMembership(queryClient, error),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: JoinGroupRequest) =>
      apiRequest('/groups/join', groupResponseSchema, { method: 'POST', body }),
    onSuccess: (group) => queryClient.setQueryData(myGroupsQuery.queryKey, [group]),
    onError: (error) => recheckMembership(queryClient, error),
  });
}
