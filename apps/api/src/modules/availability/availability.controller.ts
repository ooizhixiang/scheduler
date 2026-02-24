import {
  Controller, Get, Put, Param, Body, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto } from './dto';
import { Roles, TenantId } from '../../common/decorators';

@ApiTags('Availability')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Get(':employeeId')
  @ApiOperation({ summary: 'Get availability for an employee' })
  async getForEmployee(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.availabilityService.getForEmployee(tenantId, employeeId);
  }

  @Put(':employeeId')
  @ApiOperation({ summary: 'Set availability for an employee' })
  async setForEmployee(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.availabilityService.setForEmployee(tenantId, employeeId, dto);
  }

  @Get()
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get availability batch (all or by employee IDs)' })
  async getBatch(
    @TenantId() tenantId: string,
    @Query('employeeIds') employeeIds?: string,
  ) {
    const ids = employeeIds ? employeeIds.split(',') : undefined;
    return this.availabilityService.getBatch(tenantId, ids);
  }
}
