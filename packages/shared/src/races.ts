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
