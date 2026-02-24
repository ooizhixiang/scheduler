import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Morning Crew' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'The early morning opening team' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateGroupDto {
  @ApiPropertyOptional({ example: 'Morning Crew' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateGroupMembersDto {
  @ApiProperty({ type: [String] })
  @IsUUID('4', { each: true })
  employeeIds: string[];
}
