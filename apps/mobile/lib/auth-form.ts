import { ApiError } from '@/lib/api';

type ParseResult =
  { success: true } | { success: false; error: { issues: { path: PropertyKey[] }[] } };

export function invalidFields(result: ParseResult): Set<string> {
  if (result.success) return new Set();
  return new Set(result.error.issues.map((issue) => String(issue.path[0])));
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "Can't reach the server. Check your connection and try again.";
    if (error.status === 429) return 'Too many attempts. Wait a minute and try again.';
    if (error.status === 401 || error.status === 409) return error.message;
  }
  return 'Something went wrong. Please try again.';
}
