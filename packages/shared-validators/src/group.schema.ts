import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().max(500).optional(),
});

export const updateGroupSchema = createGroupSchema.partial();

export const updateGroupMembersSchema = z.object({
  employeeIds: z.array(z.string().uuid()),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type UpdateGroupMembersInput = z.infer<typeof updateGroupMembersSchema>;
