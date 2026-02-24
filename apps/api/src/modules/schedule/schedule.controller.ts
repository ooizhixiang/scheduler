import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { Request } from 'express';
import { ScheduleService } from './schedule.service';
import { ConflictService } from './conflict.service';
import { ViewTrackingService } from './view-tracking.service';
import { AmendmentDiffService } from './amendment-diff.service';
import { PreviewService } from './preview.service';
import { CreateScheduleDto, UpdateScheduleDto, CopyScheduleDto } from './dto';
import { Roles, TenantId, CurrentUser, Public } from '../../common/decorators';

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller('schedules')
export class ScheduleController {
  constructor(
    private scheduleService: ScheduleService,
    private conflictService: ConflictService,
    private viewTrackingService: ViewTrackingService,
    private amendmentDiffService: AmendmentDiffService,
    private previewService: PreviewService,
  ) {}

  @Post()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Create a new schedule' })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.scheduleService.create(tenantId, userId, dto);
  }

  @Get()
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'List all schedules' })
  async findAll(@TenantId() tenantId: string) {
    return this.scheduleService.findAll(tenantId);
  }

  @Get('my-schedule')
  @ApiOperation({ summary: 'Get current user\'s schedule' })
  async getMySchedule(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.scheduleService.getMySchedule(tenantId, userId);
  }

  @Public()
  @Get('preview/:token')
  @ApiOperation({ summary: 'Get read-only schedule preview via token (no auth required)' })
  async getPreview(@Param('token') token: string, @Req() req: Request) {
    return this.previewService.getPreviewSchedule(token, req.ip);
  }

  @Get('preview-tokens')
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all preview tokens' })
  async listPreviewTokens(@TenantId() tenantId: string) {
    return this.previewService.listTokens(tenantId);
  }

  @Delete('preview-tokens/:tokenId')
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke a preview token' })
  async revokePreviewToken(
    @TenantId() tenantId: string,
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
  ) {
    return this.previewService.revokeToken(tenantId, tokenId);
  }

  @Get(':id')
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get schedule by ID with all shifts' })
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.scheduleService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Update schedule' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Delete schedule' })
  async remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.scheduleService.remove(tenantId, id);
  }

  @Post(':id/publish')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Publish schedule' })
  async publish(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.scheduleService.publish(tenantId, id, userId);
  }

  @Post(':id/unpublish')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN)
  @ApiOperation({ summary: 'Unpublish schedule' })
  async unpublish(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.scheduleService.unpublish(tenantId, id, userId);
  }

  @Post(':id/copy')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Copy schedule to new date range' })
  async copy(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CopyScheduleDto,
  ) {
    return this.scheduleService.copy(tenantId, id, userId, dto);
  }

  @Get(':id/conflicts')
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get all conflicts for a schedule' })
  async getConflicts(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.conflictService.checkConflicts(tenantId, id);
  }

  @Get(':id/views')
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get view tracking status for a schedule' })
  async getViewStatus(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.viewTrackingService.getViewStatus(tenantId, id);
  }

  @Post(':id/views')
  @ApiOperation({ summary: 'Record schedule view' })
  async recordView(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.viewTrackingService.recordView(tenantId, id, userId);
  }

  @Post(':id/remind/:employeeId')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Send manual view reminder to a specific employee' })
  async sendReminder(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.viewTrackingService.sendManualReminder(tenantId, id, employeeId);
  }

  @Get(':id/amendments')
  @Roles(SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Get amendment diff for a published schedule' })
  async getAmendments(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.amendmentDiffService.computeDiff(tenantId, id);
  }

  @Post(':id/publish-amendments')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.ADMIN, SystemRole.MANAGER)
  @ApiOperation({ summary: 'Publish amendments to a published schedule with notifications' })
  async publishAmendments(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.scheduleService.publishAmendments(tenantId, id, userId);
  }
}
