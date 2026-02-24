import {
  Controller, Get, Post, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { NotificationService } from './notification.service';
import { EmailQueueService } from './email-queue.service';
import { CurrentUser, TenantId, Roles } from '../../common/decorators';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private emailQueueService: EmailQueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findAll(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notificationService.findAll(
      tenantId,
      userId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const count = await this.notificationService.getUnreadCount(tenantId, userId);
    return { count };
  }

  @Get('email-jobs/failed')
  @ApiOperation({ summary: 'List failed email jobs (Super Admin only)' })
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getFailedEmailJobs(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.emailQueueService.getFailedJobs(
      tenantId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Post('email-jobs/:id/retry')
  @ApiOperation({ summary: 'Retry a failed email job (Super Admin only)' })
  @Roles(SystemRole.SUPER_ADMIN)
  async retryEmailJob(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.emailQueueService.retryFailedJob(id);
    return { message: 'Email job queued for retry' };
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss (remove) notification from feed' })
  async dismiss(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationService.dismiss(tenantId, userId, id);
    return { message: 'Notification dismissed' };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationService.markRead(tenantId, userId, id);
    return { message: 'Notification marked as read' };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notificationService.markAllRead(tenantId, userId);
    return { message: 'All notifications marked as read' };
  }
}
