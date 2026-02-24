import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, IsArray, IsIn, Min, Max, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleVisibility, MidYearJoinPolicy } from '@prisma/client';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'My Company' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  workWeekStartDay?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(24)
  defaultShiftDuration?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  maxOvertimeHoursPerWeek?: number;

  @ApiPropertyOptional({ enum: ScheduleVisibility })
  @IsOptional()
  @IsEnum(ScheduleVisibility)
  scheduleVisibility?: ScheduleVisibility;

  @ApiPropertyOptional({ enum: MidYearJoinPolicy })
  @IsOptional()
  @IsEnum(MidYearJoinPolicy)
  midYearJoinPolicy?: MidYearJoinPolicy;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualLeaveDefaultDays?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sickLeaveDefaultDays?: number;

  @ApiPropertyOptional({ example: 48, description: 'Hours before pending leave requests escalate to Super Admin (FR33)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  leaveEscalationHours?: number;

  @ApiPropertyOptional({ example: 'WEEKLY', enum: ['WEEKLY', 'BI_WEEKLY', 'CUSTOM'] })
  @IsOptional()
  @IsString()
  @IsIn(['WEEKLY', 'BI_WEEKLY', 'CUSTOM'])
  schedulingCadence?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  customPeriodDays?: number;

  @ApiPropertyOptional({ example: [{ minShiftHours: 6, breakDurationMinutes: 30, isPaid: false }] })
  @IsOptional()
  @IsArray()
  breakRules?: any[];

  @ApiPropertyOptional({ example: 4, description: 'Day of week (0=Sunday, 6=Saturday)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  publishDay?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  setupComplete?: boolean;
}

export class UpdateNotificationPrefsDto {
  @ApiPropertyOptional({ example: { SCHEDULE_PUBLISHED: true, ROLE_ASSIGNED: false } })
  @IsOptional()
  preferences?: Record<string, boolean>;
}
