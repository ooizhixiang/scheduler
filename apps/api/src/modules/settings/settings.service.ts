import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateSettingsDto } from './dto';

// SCHEDULE_PUBLISHED is mandatory and cannot be disabled
const MANDATORY_NOTIFICATIONS = ['SCHEDULE_PUBLISHED'];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService, private auditLogService: AuditLogService) {}

  async get(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    const settings = await db.companySettings.findFirst({
      where: {},
    });

    if (!settings) {
      return db.companySettings.create({
        data: { tenantId },
      });
    }

    return settings;
  }

  async update(tenantId: string, dto: UpdateSettingsDto) {
    const db = this.prisma.forTenant(tenantId);
    const existing = await db.companySettings.findFirst({
      where: {},
    });

    if (!existing) {
      return db.companySettings.create({
        data: { tenantId, ...dto },
      });
    }

    const result = await db.companySettings.update({
      where: { id: existing.id },
      data: dto,
    });

    this.auditLogService.create({
      tenantId, action: 'UPDATE' as any, entityType: 'CompanySettings', entityId: existing.id,
      newValues: dto as any,
    }).catch(() => {});

    return result;
  }

  async getNotificationPrefs(tenantId: string, employeeId: string) {
    const db = this.prisma.forTenant(tenantId);
    const employee = await db.employee.findFirst({
      where: { id: employeeId },
      select: { notificationPrefs: true },
    });

    return { preferences: (employee?.notificationPrefs as Record<string, boolean>) || {} };
  }

  async updateNotificationPrefs(tenantId: string, employeeId: string, preferences: Record<string, boolean>) {
    const db = this.prisma.forTenant(tenantId);

    // Enforce mandatory notifications
    const sanitized = { ...preferences };
    for (const key of MANDATORY_NOTIFICATIONS) {
      sanitized[key] = true;
    }

    await db.employee.update({
      where: { id: employeeId },
      data: { notificationPrefs: sanitized },
    });

    return { preferences: sanitized };
  }
}
