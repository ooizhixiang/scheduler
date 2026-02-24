import { z } from 'zod';
import { ScheduleVisibility, MidYearJoinPolicy } from '@scheduler/shared-types';

export const updateSettingsSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  timezone: z.string().max(100).optional(),
  workWeekStartDay: z.number().int().min(0).max(6).optional(),
  defaultShiftDuration: z.number().min(0.5).max(24).optional(),
  maxOvertimeHoursPerWeek: z.number().min(0).max(168).optional(),
  scheduleVisibility: z.nativeEnum(ScheduleVisibility).optional(),
  midYearJoinPolicy: z.nativeEnum(MidYearJoinPolicy).optional(),
  annualLeaveDefaultDays: z.number().int().min(0).optional(),
  sickLeaveDefaultDays: z.number().int().min(0).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
