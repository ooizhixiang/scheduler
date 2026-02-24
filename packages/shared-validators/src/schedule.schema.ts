import { z } from 'zod';

export const createScheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required').max(200),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

export const createShiftSchema = z.object({
  scheduleId: z.string().uuid(),
  employeeId: z.string().uuid(),
  roleId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  notes: z.string().max(500).optional(),
});

export const bulkCreateShiftsSchema = z.object({
  shifts: z.array(createShiftSchema.omit({ scheduleId: true })).min(1),
});

export const copyScheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required').max(200),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type BulkCreateShiftsInput = z.infer<typeof bulkCreateShiftsSchema>;
export type CopyScheduleInput = z.infer<typeof copyScheduleSchema>;
