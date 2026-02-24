import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClockInDto {
  @ApiProperty()
  shiftId: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Client-side timestamp for offline replay (ISO string)' })
  timestamp?: string;
}

export class AdHocClockInDto {
  @ApiPropertyOptional({ description: 'Role the employee is working as' })
  roleId?: string;

  @ApiPropertyOptional({ description: 'Work location (used for geofence check)' })
  locationId?: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Client-side timestamp for offline replay (ISO string)' })
  timestamp?: string;
}

export class CreateManualClockEventDto {
  @ApiProperty({ description: 'Employee to create the event for' })
  employeeId: string;

  @ApiProperty({ description: 'Shift to attach the event to' })
  shiftId: string;

  @ApiProperty({ enum: ['CLOCK_IN', 'CLOCK_OUT'] })
  type: 'CLOCK_IN' | 'CLOCK_OUT';

  @ApiProperty({ description: 'Event timestamp (ISO string)' })
  timestamp: string;

  @ApiProperty({ description: 'Reason for manual entry' })
  reason: string;

  @ApiPropertyOptional()
  notes?: string;
}

export class AdjustClockEventDto {
  @ApiProperty({ description: 'Corrected timestamp (ISO string)' })
  timestamp: string;

  @ApiProperty({ description: 'Reason for adjustment' })
  reason: string;

  @ApiPropertyOptional()
  notes?: string;
}

export class ClockOutDto {
  @ApiProperty()
  shiftId: string;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Client-side timestamp for offline replay (ISO string)' })
  timestamp?: string;
}
