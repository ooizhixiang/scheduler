import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty, IsString, IsOptional, IsUUID, IsDateString, IsArray, ValidateNested, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduleDto {
  @ApiProperty({ example: 'Week of Feb 24' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '2026-02-24' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-02' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: 'Week of Feb 24' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: '2026-02-24' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-02' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateShiftDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiProperty({ example: '2026-02-24' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ example: '2026-02-24T09:00:00.000Z' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ example: '2026-02-24T17:00:00.000Z' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ example: 'Opening shift' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateShiftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class BulkCreateShiftsDto {
  @ApiProperty({ type: [CreateShiftDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShiftDto)
  shifts: CreateShiftDto[];
}

export class CopyScheduleDto {
  @ApiProperty({ example: 'Copy of Week 1' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '2026-03-03' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-09' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}
