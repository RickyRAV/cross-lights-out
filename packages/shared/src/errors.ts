import { z } from 'zod';

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const validationErrorResponseSchema = z.object({
  error: z.string(),
  issues: z.array(z.unknown()),
});
export type ValidationErrorResponse = z.infer<typeof validationErrorResponseSchema>;
