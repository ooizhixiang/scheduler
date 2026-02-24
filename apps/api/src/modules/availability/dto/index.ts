import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty, IsString, IsBoolean, IsOptional, IsEnum, IsArray, ValidateNested, Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilityEntryDto {
  @ApiProperty({ enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] })
  @IsNotEmpty()
  @IsEnum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
  dayOfWeek: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable: boolean;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Must be HH:mm format' })
  startTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Must be HH:mm format' })
  endTime?: string;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: [AvailabilityEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityEntryDto)
  entries: AvailabilityEntryDto[];
}
