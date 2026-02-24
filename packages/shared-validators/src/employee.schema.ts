import { z } from 'zod';
import { SystemRole, EmploymentType } from '@scheduler/shared-types';

export const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(20).optional(),
  systemRole: z.nativeEnum(SystemRole).default(SystemRole.EMPLOYEE),
  employmentType: z.nativeEnum(EmploymentType).default(EmploymentType.FULL_TIME),
  departmentId: z.string().uuid().optional(),
  hireDate: z.string().optional(),
  weeklyHoursCap: z.number().min(0).max(168).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ email: true });

export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
