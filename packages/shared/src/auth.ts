import { z } from 'zod';

export const registerRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(64),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const tokenPairResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type TokenPairResponse = z.infer<typeof tokenPairResponseSchema>;

export const authResponseSchema = tokenPairResponseSchema.extend({
  user: z.object({
    id: z.uuid(),
    email: z.email(),
    displayName: z.string(),
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
