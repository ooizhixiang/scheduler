import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_UNIQUE_IPS_24H = 10;

@Injectable()
export class PreviewService {
  constructor(private prisma: PrismaService) {}

  /** Validate token and return read-only shift data (AC2, AC3) */
  async getPreviewSchedule(token: string, ipAddress?: string) {
    const previewToken = await this.prisma.previewToken.findUnique({
      where: { token },
      include: {
        employee: {
          select: { id: true, tenantId: true, firstName: true, lastName: true },
        },
      },
    });

    if (!previewToken) {
      throw new NotFoundException('INVALID_TOKEN');
    }

    // AC5: expired or revoked
    if (previewToken.revokedAt || previewToken.expiresAt < new Date()) {
      throw new BadRequestException('EXPIRED_TOKEN');
    }

    // AC6: log IP access
    const accessLog: { ip: string; timestamp: string }[] =
      (previewToken.accessLog as any[]) || [];
    if (ipAddress) {
      accessLog.push({ ip: ipAddress, timestamp: new Date().toISOString() });

      // Detect >10 unique IPs in 24h
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentIps = new Set(
        accessLog
          .filter((a) => new Date(a.timestamp).getTime() > oneDayAgo)
          .map((a) => a.ip),
      );

      // Keep only last 200 entries to prevent unbounded growth
      const trimmedLog = accessLog.slice(-200);

      await this.prisma.previewToken.update({
        where: { id: previewToken.id },
        data: { accessLog: trimmedLog },
      });

      if (recentIps.size > MAX_UNIQUE_IPS_24H) {
        // Log alert — in production this would trigger a notification
        console.warn(
          `[SECURITY] Preview token ${previewToken.id} accessed from ${recentIps.size} unique IPs in 24h`,
        );
      }
    }

    const { employee } = previewToken;
    const tenantId = employee.tenantId;

    // Get published schedules with this employee's shifts
    const now = new Date();
    const schedules = await this.prisma.schedule.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        endDate: { gte: now },
        shifts: { some: { employeeId: employee.id } },
      },
      include: {
        shifts: {
          where: { employeeId: employee.id },
          include: {
            role: { select: { name: true, color: true, shortCode: true } },
            location: { select: { name: true } },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return {
      employeeName: `${employee.firstName} ${employee.lastName}`,
      schedules: schedules.map((s) => ({
        id: s.id,
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        shifts: s.shifts.map((shift) => ({
          id: shift.id,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          roleName: shift.role?.name,
          roleColor: shift.role?.color,
          roleShortCode: shift.role?.shortCode,
          locationName: shift.location?.name,
        })),
      })),
    };
  }

  /** AC4: Revoke a preview token (SUPER_ADMIN only) */
  async revokeToken(tenantId: string, tokenId: string) {
    const token = await this.prisma.previewToken.findFirst({
      where: { id: tokenId, tenantId },
    });

    if (!token) {
      throw new NotFoundException('Preview token not found');
    }

    await this.prisma.previewToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    return { revoked: true };
  }

  /** List preview tokens for an employee (admin view) */
  async listTokens(tenantId: string, employeeId?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (employeeId) where.employeeId = employeeId;

    return this.prisma.previewToken.findMany({
      where: where as any,
      select: {
        id: true,
        employeeId: true,
        token: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        employee: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
