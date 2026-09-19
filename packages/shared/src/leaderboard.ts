import { z } from 'zod';

export const leaderboardEntrySchema = z.object({
  userId: z.uuid(),
  displayName: z.string(),
  totalPoints: z.number().int(),
  racesScored: z.number().int(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const leaderboardResponseSchema = z.array(leaderboardEntrySchema);
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
