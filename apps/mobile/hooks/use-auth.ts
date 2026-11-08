import {
  authResponseSchema,
  meResponseSchema,
  type LoginRequest,
  type RegisterRequest,
} from '@lightsout/shared';
import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: ({ signal }) => apiRequest('/users/me', meResponseSchema, { signal }),
});

export function useMe() {
  return useQuery(meQuery);
}

export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiRequest('/auth/login', authResponseSchema, { method: 'POST', body, auth: false }),
    onSuccess: (data) => useAuthStore.getState().setTokens(data),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: RegisterRequest) =>
      apiRequest('/auth/register', authResponseSchema, { method: 'POST', body, auth: false }),
    onSuccess: (data) => useAuthStore.getState().setTokens(data),
  });
}
