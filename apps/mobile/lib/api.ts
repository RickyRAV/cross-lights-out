import { tokenPairResponseSchema } from '@lightsout/shared';
import { fetch } from 'expo/fetch';
import { useAuthStore } from '@/store/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://lightsout-api.w11core.cc/api/v1';

type Schema<T> = { parse: (data: unknown) => T };

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function send(
  path: string,
  { method = 'GET', body, signal }: RequestOptions,
  token?: string,
) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'NetworkError', 'Could not reach the server');
  }
}

async function toApiError(response: Awaited<ReturnType<typeof send>>) {
  const data = await response.json().catch(() => null);
  return new ApiError(
    response.status,
    data?.error ?? 'HttpError',
    data?.message ?? `Request failed with status ${response.status}`,
  );
}

let pendingRefresh: Promise<string | null> | null = null;

function refreshAccessToken() {
  pendingRefresh ??= (async () => {
    const { refreshToken, setTokens, signOut } = useAuthStore.getState();
    if (!refreshToken) return null;

    const response = await send('/auth/refresh', { method: 'POST', body: { refreshToken } });
    const sessionUnchanged = useAuthStore.getState().refreshToken === refreshToken;
    if (response.status === 401) {
      if (sessionUnchanged) await signOut();
      return null;
    }
    if (!response.ok) throw await toApiError(response);

    const tokens = tokenPairResponseSchema.parse(await response.json());
    if (!sessionUnchanged) return null;
    await setTokens(tokens);
    return tokens.accessToken;
  })().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

export async function apiRequest<T>(
  path: string,
  schema: Schema<T>,
  options: RequestOptions = {},
): Promise<T> {
  const auth = options.auth ?? true;
  const token = auth ? (useAuthStore.getState().accessToken ?? undefined) : undefined;
  let response = await send(path, options, token);

  if (auth && response.status === 401) {
    const current = useAuthStore.getState().accessToken;
    const nextToken = current && current !== token ? current : await refreshAccessToken();
    if (nextToken) response = await send(path, options, nextToken);
  }

  if (!response.ok) throw await toApiError(response);
  return schema.parse(await response.json());
}

export function nullIfNotFound(error: unknown): null {
  if (error instanceof ApiError && error.status === 404) return null;
  throw error;
}
