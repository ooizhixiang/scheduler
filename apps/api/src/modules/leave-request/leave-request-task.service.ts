import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaveRequestStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

const NUDGE_THRESHOLD_HOURS = 24;

@Injectable()
export class LeaveRequestTaskService {
  private readonly logger = new Logger(LeaveRequestTaskService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleLeaveNudgesAndEscalations() {
    this.logger.log('Running leave request nudge & escalation check...');
    try {
      const result = await this.processAllTenants();
      this.logger.log(
        `Leave nudge check complete: ${result.nudges} nudges, ${result.escalations} escalations`,
      );
    } catch (err) {
      this.logger.error(`Leave nudge check failed: ${err}`);
    }
  }

  async processAllTenants() {
    // Find all tenants with pending leave requests
    const tenantRows = await this.prisma.leaveRequest.findMany({
      where: { status: LeaveRequestStatus.PENDING },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });

    let totalNudges = 0;
    let totalEscalations = 0;

    for (const { tenantId } of tenantRows) {
      try {
        const result = await this.processTenant(tenantId);
        totalNudges += result.nudges;
        totalEscalations += result.escalations;
      } catch (err) {
        this.logger.error(`Failed to process tenant ${tenantId}: ${err}`);
      }
    }

    return { nudges: totalNudges, escalations: totalEscalations };
  }

  async processTenant(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    const now = new Date();

    // Get configurable escalation threshold
    const settings = await db.companySettings.findFirst({ where: {} });
    const escalationHours = settings?.leaveEscalationHours ?? 48;

    const nudgeCutoff = new Date(now.getTime() - NUDGE_THRESHOLD_HOURS * 60 * 60 * 1000);
    const escalationCutoff = new Date(now.getTime() - escalationHours * 60 * 60 * 1000);

    // Get all pending requests that are old enough for nudge or escalation
    const pendingRequests = await db.leaveRequest.findMany({
      where: {
        status: LeaveRequestStatus.PENDING,
        createdAt: { lte: nudgeCutoff },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            departmentId: true,
          },
        },
      },
    });

    let nudges = 0;
    let escalations = 0;

    for (const request of pendingRequests) {
      const hoursAgo = Math.floor(
        (now.getTime() - new Date(request.createdAt).getTime()) / (60 * 60 * 1000),
      );
      const dateStr = new Date(request.date).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const employeeName = `${request.employee.firstName} ${request.employee.lastName}`;

      // AC2/AC3: Escalation to Super Admin after configurable threshold
      if (
        new Date(request.createdAt) <= escalationCutoff &&
        !request.escalatedAt
      ) {
        // Find the manager for this employee's department
        const manager = request.employee.departmentId
          ? await db.employee.findFirst({
              where: {
                managedDepartments: { some: { id: request.employee.departmentId } },
              },
              select: { firstName: true, lastName: true },
            })
          : null;
        const managerName = manager
          ? `${manager.firstName} ${manager.lastName}`
          : 'No manager assigned';

        // Find all super admins
        const superAdmins = await db.employee.findMany({
          where: { systemRole: 'SUPER_ADMIN', status: 'ACTIVE' },
          select: { id: true },
        });

        for (const admin of superAdmins) {
          await this.notificationService.createNotification({
            tenantId,
            recipientId: admin.id,
            type: NotificationType.LEAVE_ESCALATED,
            title: 'Escalated: Pending day-off request',
            body: `Escalated: ${employeeName}'s day-off request pending ${hoursAgo}h — ${managerName} hasn't responded`,
            link: '/approvals',
          });
        }

        // Mark escalated
        await db.leaveRequest.update({
          where: { id: request.id },
          data: { escalatedAt: now },
        });

        escalations++;
      }
      // AC1: Nudge to manager after 24h (only if not already nudged and not yet escalated)
      else if (!request.nudgeSentAt) {
        // Find the manager(s) for this employee's department
        const managers: { id: string }[] = [];

        if (request.employee.departmentId) {
          const deptManager = await db.employee.findFirst({
            where: {
              managedDepartments: { some: { id: request.employee.departmentId } },
            },
            select: { id: true },
          });
          if (deptManager) managers.push(deptManager);
        }

        // Also notify admins if no department manager
        if (managers.length === 0) {
          const admins = await db.employee.findMany({
            where: { systemRole: { in: ['SUPER_ADMIN', 'ADMIN'] }, status: 'ACTIVE' },
            select: { id: true },
          });
          managers.push(...admins);
        }

        for (const mgr of managers) {
          await this.notificationService.createNotification({
            tenantId,
            recipientId: mgr.id,
            type: NotificationType.LEAVE_NUDGE,
            title: 'Pending approval reminder',
            body: `Pending approval: ${employeeName} requested ${dateStr} off — submitted ${hoursAgo}h ago`,
            link: '/approvals',
          });
        }

        // AC4: Mark nudge sent to prevent duplicates
        await db.leaveRequest.update({
          where: { id: request.id },
          data: { nudgeSentAt: now },
        });

        nudges++;
      }
    }

    return { nudges, escalations };
  }
}
