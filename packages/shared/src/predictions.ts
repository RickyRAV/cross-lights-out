import { z } from 'zod';

export const submitPredictionRequestSchema = z.object({
  raceId: z.string().min(1),
  predictedOrder: z
    .array(z.string().min(1))
    .length(5)
    .refine((order) => new Set(order).size === order.length, {
      message: 'predictedOrder must not contain duplicate drivers',
    }),
});
export type SubmitPredictionRequest = z.infer<typeof submitPredictionRequestSchema>;

export const predictionResponseSchema = z.object({
  id: z.uuid(),
  raceId: z.string(),
  predictedOrder: z.array(z.string()),
  submittedAt: z.iso.datetime(),
  lockedAt: z.iso.datetime(),
});
export type PredictionResponse = z.infer<typeof predictionResponseSchema>;

export const memberPredictionStatusSchema = z.object({
  userId: z.uuid(),
  displayName: z.string(),
  submitted: z.boolean(),
  predictedOrder: z.array(z.string()).nullable(),
  points: z.number().int().nullable().default(null),
});
export type MemberPredictionStatus = z.infer<typeof memberPredictionStatusSchema>;

export const groupRacePredictionsResponseSchema = z.array(memberPredictionStatusSchema);
export type GroupRacePredictionsResponse = z.infer<typeof groupRacePredictionsResponseSchema>;
