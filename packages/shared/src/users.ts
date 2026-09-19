import { z } from 'zod';

export const meResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

export const historyEntrySchema = z.object({
  raceId: z.string(),
  predictedOrder: z.array(z.string()),
  submittedAt: z.iso.datetime(),
  actualOrder: z.array(z.string()).nullable(),
  points: z.number().int().nullable(),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const historyResponseSchema = z.array(historyEntrySchema);
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
