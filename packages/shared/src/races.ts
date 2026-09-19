import { z } from 'zod';

export const raceResponseSchema = z.object({
  raceId: z.string(),
  name: z.string(),
  circuit: z.string(),
  lockoutAt: z.iso.datetime(),
});
export type RaceResponse = z.infer<typeof raceResponseSchema>;

export const raceListResponseSchema = z.array(raceResponseSchema);
export type RaceListResponse = z.infer<typeof raceListResponseSchema>;

export const raceResultResponseSchema = z.object({
  raceId: z.string(),
  actualOrder: z.array(z.string()),
  gradedAt: z.iso.datetime(),
});
export type RaceResultResponse = z.infer<typeof raceResultResponseSchema>;
