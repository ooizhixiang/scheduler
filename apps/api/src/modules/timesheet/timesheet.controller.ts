import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { TimesheetService } from './timesheet.service';
import { Roles, TenantId, CurrentUser } from '../../common/decorators';

@ApiTags('Timesheets')
@ApiBearerAuth()
@Controller('timesheets')
export class TimesheetController {
  constructor(private timesheetService: TimesheetService) {}

  // ─── Manager endpoints ──────────────────────────────────────────────────

  @Get('team')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get team timesheets scoped by department (FR23/FR57)' })
  async getTeamTimesheets(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.timesheetService.getManagerTimesheets(tenantId, managerId, from, to, departmentId);
  }

  @Get()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get computed timesheets for a period (FR19)' })
  async getTimesheets(
    @TenantId() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.timesheetService.computeTimesheets(tenantId, from, to, {
      employeeId,
      departmentId,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get own timesheet for a period' })
  async getMyTimesheet(
    @TenantId() tenantId: string,
    @CurrentUser('sub') employeeId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.timesheetService.getEmployeeTimesheet(tenantId, employeeId, from, to);
  }

  @Get('csv')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Export timesheets as CSV (FR24)' })
  async exportCsv(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('departmentId') departmentId?: string,
  ) {
    // Use manager-scoped timesheets for department filtering
    const result = await this.timesheetService.getManagerTimesheets(
      tenantId,
      managerId,
      from,
      to,
      departmentId,
    );

    // NFR29/AC2: Prevent CSV export if unreviewed flags exist
    const unreviewedCount = this.timesheetService.countUnreviewedFlags(result);
    if (unreviewedCount > 0) {
      return {
        error: 'UNREVIEWED_FLAGS',
        message: `${unreviewedCount} timesheet entries need review before export. Resolve flagged entries first.`,
        flagCount: unreviewedCount,
      };
    }

    return {
      filename: `timesheets-${from}-${to}.csv`,
      contentType: 'text/csv',
      content: this.timesheetService.generateCsv(result),
    };
  }

  // ─── Flag review endpoints (Story 8.3 AC3) ──────────────────────────────

  @Post(':shiftId/review')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Mark a shift timesheet entry as reviewed (NFR29)' })
  async reviewShift(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() body: { note?: string },
  ) {
    return this.timesheetService.reviewShift(tenantId, managerId, shiftId, body.note);
  }

  @Post('review-employee')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Batch review all flagged shifts for an employee in a period' })
  async reviewEmployeeShifts(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Body() body: { employeeId: string; from: string; to: string; note?: string },
  ) {
    return this.timesheetService.reviewEmployeeShifts(
      tenantId,
      managerId,
      body.employeeId,
      body.from,
      body.to,
      body.note,
    );
  }
}
