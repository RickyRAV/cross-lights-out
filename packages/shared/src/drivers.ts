import { z } from 'zod';

export const driverResponseSchema = z.object({
  code: z.string(),
  name: z.string(),
  team: z.string().nullable().default(null),
});
export type DriverResponse = z.infer<typeof driverResponseSchema>;

export const driverListResponseSchema = z.array(driverResponseSchema);
export type DriverListResponse = z.infer<typeof driverListResponseSchema>;
