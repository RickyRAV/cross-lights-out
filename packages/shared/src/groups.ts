import { z } from 'zod';

export const createGroupRequestSchema = z.object({
  name: z.string().min(1).max(64),
});
export type CreateGroupRequest = z.infer<typeof createGroupRequestSchema>;

export const groupResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  inviteCode: z.string(),
  createdAt: z.iso.datetime(),
});
export type GroupResponse = z.infer<typeof groupResponseSchema>;

export const joinGroupRequestSchema = z.object({
  inviteCode: z.string().min(1),
});
export type JoinGroupRequest = z.infer<typeof joinGroupRequestSchema>;
