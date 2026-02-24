import { z } from 'zod';

const DAYS_OF_WEEK = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
] as const;

export const availabilityEntrySchema = z.object({
  dayOfWeek: z.enum(DAYS_OF_WEEK),
  isAvailable: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format').optional(),
});

export const setAvailabilitySchema = z.object({
  entries: z.array(availabilityEntrySchema).min(1).max(7),
});

export type AvailabilityEntryInput = z.infer<typeof availabilityEntrySchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
