import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.iso.datetime(),
  service: z.string(),
  version: z.string(),
  database: z.enum(['up', 'down']),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
