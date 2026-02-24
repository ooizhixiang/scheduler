import {
  Controller, Post, Patch, Delete, Param, Body, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { ShiftService } from './shift.service';
import { CreateShiftDto, UpdateShiftDto, BulkCreateShiftsDto } from './dto';
import { Roles, TenantId } from '../../common/decorators';

@ApiTags('Shifts')
@ApiBearerAuth()
@Controller('schedules/:scheduleId/shifts')
export class ShiftController {
  constructor(private shiftService: ShiftService) {}

  @Post()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Create a shift' })
  async create(
    @TenantId() tenantId: string,
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
    @Body() dto: CreateShiftDto,
  ) {
    return this.shiftService.create(tenantId, scheduleId, dto);
  }

  @Post('bulk')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Create multiple shifts' })
  async createBulk(
    @TenantId() tenantId: string,
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
    @Body() dto: BulkCreateShiftsDto,
  ) {
    return this.shiftService.createBulk(tenantId, scheduleId, dto);
  }

  @Patch(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Update a shift' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.shiftService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Delete a shift' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shiftService.remove(tenantId, id);
  }
}
