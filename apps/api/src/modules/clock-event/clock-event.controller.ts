import { Controller, Post, Get, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { ClockEventService } from './clock-event.service';
import { ClockInDto, ClockOutDto, AdHocClockInDto, CreateManualClockEventDto, AdjustClockEventDto } from './dto';
import { Roles, TenantId, CurrentUser } from '../../common/decorators';

@ApiTags('Clock Events')
@ApiBearerAuth()
@Controller('clock-events')
export class ClockEventController {
  constructor(private clockEventService: ClockEventService) {}

  // ─── Employee endpoints ──────────────────────────────────────────────────

  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in to a shift with GPS verification' })
  async clockIn(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ClockInDto,
  ) {
    return this.clockEventService.clockIn(tenantId, userId, dto);
  }

  @Post('adhoc-clock-in')
  @ApiOperation({ summary: 'Ad-hoc clock-in for an unscheduled shift (FR25)' })
  async adhocClockIn(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AdHocClockInDto,
  ) {
    return this.clockEventService.adhocClockIn(tenantId, userId, dto);
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out of a shift' })
  async clockOut(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ClockOutDto,
  ) {
    return this.clockEventService.clockOut(tenantId, userId, dto);
  }

  @Get('shift/:shiftId')
  @ApiOperation({ summary: 'Get clock events for a shift' })
  async getByShift(
    @TenantId() tenantId: string,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
  ) {
    return this.clockEventService.getByShift(tenantId, shiftId);
  }

  // ─── Story 8.2: Employee's own clock history ────────────────────────────

  @Get('my-history')
  @ApiOperation({ summary: 'Get own clock event history with attribution (FR22)' })
  async getMyClockHistory(
    @TenantId() tenantId: string,
    @CurrentUser('sub') employeeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.clockEventService.getEmployeeClockHistory(tenantId, employeeId, from, to);
  }

  // ─── Manager endpoints (Story 7.1) ──────────────────────────────────────

  @Post('manual')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Manager creates a manual clock event for an employee (FR15)' })
  async createManualClockEvent(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Body() dto: CreateManualClockEventDto,
  ) {
    return this.clockEventService.createManualClockEvent(tenantId, managerId, dto);
  }

  @Post(':eventId/adjust')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Manager adjusts an existing clock event timestamp (AC3)' })
  async adjustClockEvent(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: AdjustClockEventDto,
  ) {
    return this.clockEventService.adjustClockEvent(tenantId, managerId, eventId, dto);
  }

  // ─── Story 7.3: Team Attendance StatusBoard ────────────────────────────────

  @Get('team/attendance')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get team attendance status for today (FR56)' })
  async getTeamAttendance(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.clockEventService.getTeamAttendance(tenantId, managerId, departmentId);
  }

  @Get('employee/:employeeId')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get clock event history for an employee with adjustment attribution (AC4)' })
  async getEmployeeClockHistory(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.clockEventService.getEmployeeClockHistory(tenantId, employeeId, from, to);
  }
}
