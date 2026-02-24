import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ScheduleViewStatus, SCHEDULE_VIEW_REMINDER_HOURS } from '@scheduler/shared-types';

@Injectable()
export class ViewTrackingService {
  private readonly logger = new Logger(ViewTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async recordView(tenantId: string, scheduleId: string, employeeId: string) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await db.schedule.findFirst({
      where: { id: scheduleId, status: 'PUBLISHED' },
    });

    if (!schedule) {
      throw new NotFoundException('Published schedule not found');
    }

    return db.scheduleView.upsert({
      where: { scheduleId_employeeId: { scheduleId, employeeId } },
      create: {
        tenantId,
        scheduleId,
        employeeId,
      },
      update: {
        viewedAt: new Date(),
      },
    });
  }

  async getViewStatus(tenantId: string, scheduleId: string): Promise<ScheduleViewStatus> {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await db.schedule.findFirst({
      where: { id: scheduleId },
      include: {
        shifts: {
          select: { employeeId: true },
          distinct: ['employeeId'],
        },
        views: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const assignedEmployeeIds = [...new Set(schedule.shifts.map((s) => s.employeeId))];
    const viewedEmployeeIds = new Set(schedule.views.map((v) => v.employeeId));

    const viewedEmployees = schedule.views
      .filter((v) => assignedEmployeeIds.includes(v.employeeId))
      .map((v) => ({
        id: v.employee.id,
        firstName: v.employee.firstName,
        lastName: v.employee.lastName,
        viewedAt: v.viewedAt.toISOString(),
      }));

    const pendingEmployeeIds = assignedEmployeeIds.filter((id) => !viewedEmployeeIds.has(id));

    // Look up reminder status for pending employees
    const pendingViews = schedule.views.filter(
      (v) => pendingEmployeeIds.includes(v.employeeId) && v.reminderSentAt,
    );
    const reminderSentMap = new Map(
      pendingViews.map((v) => [v.employeeId, v.reminderSentAt!.toISOString()]),
    );

    const pendingEmployeesRaw = await db.employee.findMany({
      where: { id: { in: pendingEmployeeIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const pendingEmployees = pendingEmployeesRaw.map((emp) => ({
      ...emp,
      reminderSentAt: reminderSentMap.get(emp.id) || null,
    }));

    return {
      total: assignedEmployeeIds.length,
      viewed: viewedEmployees.length,
      pending: pendingEmployees.length,
      viewedEmployees,
      pendingEmployees,
    };
  }

  /**
   * Send a manual reminder to a specific employee (FR10).
   * Dedup is handled by NotificationService (15-min window).
   */
  async sendManualReminder(tenantId: string, scheduleId: string, employeeId: string) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await db.schedule.findFirst({
      where: { id: scheduleId, status: 'PUBLISHED' },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    if (!schedule) {
      throw new NotFoundException('Published schedule not found');
    }

    // Check employee is assigned to this schedule
    const hasShift = await db.shift.findFirst({
      where: { scheduleId, employeeId },
      select: { id: true },
    });

    if (!hasShift) {
      throw new BadRequestException('Employee is not assigned to this schedule');
    }

    // Check if already viewed
    const existingView = await db.scheduleView.findUnique({
      where: { scheduleId_employeeId: { scheduleId, employeeId } },
    });

    if (existingView && existingView.viewedAt > new Date(0)) {
      throw new BadRequestException('Employee has already viewed this schedule');
    }

    const startDateStr = new Date(schedule.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const endDateStr = new Date(schedule.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    // Send notification (dedup handled by NotificationService)
    await this.notificationService.createNotification({
      tenantId,
      recipientId: employeeId,
      type: 'SCHEDULE_VIEW_REMINDER' as any,
      title: 'Reminder: View your schedule',
      body: `Reminder: Please review your schedule "${schedule.name}". Check your shifts.`,
      link: '/my-schedule',
      templateData: {
        scheduleName: schedule.name,
        startDate: startDateStr,
        endDate: endDateStr,
      },
    });

    // Record reminderSentAt
    await db.scheduleView.upsert({
      where: { scheduleId_employeeId: { scheduleId, employeeId } },
      create: {
        tenantId,
        scheduleId,
        employeeId,
        reminderSentAt: new Date(),
        viewedAt: new Date(0),
      },
      update: { reminderSentAt: new Date() },
    });

    return { sent: true };
  }

  /**
   * Automatic background job: sends reminders to employees who haven't viewed
   * published schedules >48h old, and nudges the schedule owner (AC1, AC5).
   */
  async sendReminders(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    const cutoff = new Date(Date.now() - SCHEDULE_VIEW_REMINDER_HOURS * 60 * 60 * 1000);

    const publishedSchedules = await db.schedule.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: cutoff },
      },
      include: {
        shifts: { select: { employeeId: true }, distinct: ['employeeId'] },
        views: { select: { employeeId: true, reminderSentAt: true } },
      },
    });

    let remindersSent = 0;

    for (const schedule of publishedSchedules) {
      const assignedIds = new Set(schedule.shifts.map((s) => s.employeeId));
      const viewedIds = new Set(schedule.views.map((v) => v.employeeId));
      const sentIds = new Set(
        schedule.views.filter((v) => v.reminderSentAt).map((v) => v.employeeId),
      );

      const unviewedIds: string[] = [];

      for (const employeeId of assignedIds) {
        if (!viewedIds.has(employeeId) && !sentIds.has(employeeId)) {
          unviewedIds.push(employeeId);

          await this.notificationService.createNotification({
            tenantId,
            recipientId: employeeId,
            type: 'SCHEDULE_VIEW_REMINDER' as any,
            title: 'Reminder: View your schedule',
            body: `You haven't viewed schedule "${schedule.name}" yet. Please check your shifts.`,
            link: '/my-schedule',
            templateData: {
              scheduleName: schedule.name,
            },
          });

          await db.scheduleView.upsert({
            where: { scheduleId_employeeId: { scheduleId: schedule.id, employeeId } },
            create: {
              tenantId,
              scheduleId: schedule.id,
              employeeId,
              reminderSentAt: new Date(),
              viewedAt: new Date(0),
            },
            update: { reminderSentAt: new Date() },
          });

          remindersSent++;
        }
      }

      // Nudge the schedule owner/creator (AC1): "{count} employees haven't viewed schedule '{name}' yet"
      if (unviewedIds.length > 0 && schedule.createdById) {
        this.notificationService.createNotification({
          tenantId,
          recipientId: schedule.createdById,
          type: 'SCHEDULE_VIEW_REMINDER' as any,
          title: 'Unviewed schedule',
          body: `${unviewedIds.length} employee${unviewedIds.length > 1 ? 's' : ''} haven't viewed schedule "${schedule.name}" yet.`,
          link: `/schedules/${schedule.id}`,
        }).catch(() => {});
      }
    }

    return { remindersSent };
  }

  /**
   * Run reminders for all tenants (called by cron job).
   * Discovers tenants from published schedules since there's no Tenant table.
   */
  async sendRemindersAllTenants() {
    const tenantRows = await this.prisma.schedule.findMany({
      where: { status: 'PUBLISHED' },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });
    let total = 0;

    for (const { tenantId } of tenantRows) {
      try {
        const result = await this.sendReminders(tenantId);
        total += result.remindersSent;
      } catch (err) {
        this.logger.error(`Failed to send reminders for tenant ${tenantId}: ${err}`);
      }
    }

    this.logger.log(`Reminder job complete: ${total} reminders sent across ${tenantRows.length} tenants`);
    return { total };
  }
}
