import { Controller, Post, Get, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeaveReason, SystemRole } from '@prisma/client';
import { LeaveRequestService } from './leave-request.service';
import { Roles, TenantId, CurrentUser } from '../../common/decorators';

@ApiTags('Leave Requests')
@ApiBearerAuth()
@Controller('leave-requests')
export class LeaveRequestController {
  constructor(private leaveRequestService: LeaveRequestService) {}

  // ─── Employee endpoints ──────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Request a day off (FR26)' })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('sub') employeeId: string,
    @Body() dto: { date: string; reason: LeaveReason; notes?: string },
  ) {
    return this.leaveRequestService.create(tenantId, employeeId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get own leave requests — pending and past (FR70)' })
  async getMyRequests(
    @TenantId() tenantId: string,
    @CurrentUser('sub') employeeId: string,
  ) {
    return this.leaveRequestService.getMyRequests(tenantId, employeeId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get own leave balance (FR30)' })
  async getMyBalance(
    @TenantId() tenantId: string,
    @CurrentUser('sub') employeeId: string,
  ) {
    return this.leaveRequestService.getLeaveBalance(tenantId, employeeId);
  }

  @Get('balance/:employeeId')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get employee leave balance (FR30)' })
  async getEmployeeBalance(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.leaveRequestService.getLeaveBalance(tenantId, employeeId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending leave request (AC4)' })
  async cancel(
    @TenantId() tenantId: string,
    @CurrentUser('sub') employeeId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveRequestService.cancel(tenantId, employeeId, id);
  }

  // ─── Manager endpoints (Story 9.2) ────────────────────────────────────

  @Get('pending')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get pending leave requests for approval feed (FR34)' })
  async getPendingRequests(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.leaveRequestService.getPendingRequests(tenantId, managerId, departmentId);
  }

  @Post(':id/approve')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Approve a leave request (FR27)' })
  async approve(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveRequestService.approve(tenantId, managerId, id);
  }

  @Post(':id/reject')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Reject a leave request with reason (FR27)' })
  async reject(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { reason: string },
  ) {
    return this.leaveRequestService.reject(tenantId, managerId, id, dto.reason);
  }

  @Post(':id/undo')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Undo an approval/rejection within undo window (FR31)' })
  async undo(
    @TenantId() tenantId: string,
    @CurrentUser('sub') managerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveRequestService.undo(tenantId, managerId, id);
  }

  @Get('approved-leaves')
  @ApiOperation({ summary: 'Get approved leave dates for a date range (FR29)' })
  async getApprovedLeaves(
    @TenantId() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.leaveRequestService.getApprovedLeaves(tenantId, startDate, endDate, employeeId);
  }

  @Get(':id/coverage-impact')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get coverage impact for a leave request (FR28)' })
  async getCoverageImpact(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveRequestService.getCoverageImpact(tenantId, id);
  }

  // ─── Shared ───────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single leave request by ID' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaveRequestService.findOne(tenantId, id);
  }
}
