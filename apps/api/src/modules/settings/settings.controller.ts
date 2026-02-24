import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto, UpdateNotificationPrefsDto } from './dto';
import { Roles, TenantId, CurrentUser } from '../../common/decorators';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get company settings' })
  async get(@TenantId() tenantId: string) {
    return this.settingsService.get(tenantId);
  }

  @Patch()
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update company settings (Super Admin only)' })
  async update(@TenantId() tenantId: string, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(tenantId, dto);
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  async getNotificationPrefs(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.settingsService.getNotificationPrefs(tenantId, user.id);
  }

  @Patch('notification-preferences')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  async updateNotificationPrefs(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateNotificationPrefsDto,
  ) {
    return this.settingsService.updateNotificationPrefs(tenantId, user.id, dto.preferences || {});
  }
}
