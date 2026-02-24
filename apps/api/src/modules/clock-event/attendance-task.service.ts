import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const MISSING_CLOCK_IN_MINUTES = 15;
const CLOCK_OUT_WARNING_MINUTES = 15;
const AUTO_CLOCK_OUT_MINUTES = 60;

@Injectable()
export class AttendanceTaskService {
  private readonly logger = new Logger(AttendanceTaskService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private auditLogService: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAttendanceChecks() {
    this.logger.log('Running attendance check...');
    try {
      const result = await this.checkAllTenants();
      this.logger.log(
        `Attendance check complete: ${result.missingClockInReminders} missing clock-in reminders, ` +
        `${result.clockOutWarnings} clock-out warnings, ${result.autoClockOuts} auto-clock-outs, ` +
        `${result.missingEmployeeAlerts} missing-employee alerts`,
      );
    } catch (err) {
      this.logger.error(`Attendance check failed: ${err}`);
    }
  }

  async checkAllTenants() {
    // Find all tenants that have shifts (query without tenant scoping)
    const tenantRows = await this.prisma.shift.findMany({
      select: { tenantId: true },
      distinct: ['tenantId'],
    });

    let missingClockInReminders = 0;
    let clockOutWarnings = 0;
    let autoClockOuts = 0;
    let missingEmployeeAlerts = 0;

    for (const { tenantId } of tenantRows) {
      try {
        const result = await this.checkTenant(tenantId);
        missingClockInReminders += result.missingClockInReminders;
        clockOutWarnings += result.clockOutWarnings;
        autoClockOuts += result.autoClockOuts;
        missingEmployeeAlerts += result.missingEmployeeAlerts;
      } catch (err) {
        this.logger.error(`Attendance check failed for tenant ${tenantId}: ${err}`);
      }
    }

    return { missingClockInReminders, clockOutWarnings, autoClockOuts, missingEmployeeAlerts };
  }

  async checkTenant(tenantId: string) {
    const now = new Date();
    let missingClockInReminders = 0;
    let clockOutWarnings = 0;
    let autoClockOuts = 0;
    let missingEmployeeAlerts = 0;

    // ─── AC1: Missing clock-in reminders (shift start + 15min, no clock-in) ───

    const missingClockInCutoff = new Date(now.getTime() - MISSING_CLOCK_IN_MINUTES * 60 * 1000);
    // Look for shifts that started between 15min ago and 30min ago (to avoid re-checking old shifts)
    const missingClockInWindow = new Date(now.getTime() - 30 * 60 * 1000);

    const db = this.prisma.forTenant(tenantId);

    const shiftsNeedingClockInReminder = await db.shift.findMany({
      where: {
        startTime: {
          gte: missingClockInWindow,
          lte: missingClockInCutoff,
        },
        // Only published schedules or ad-hoc shifts
        OR: [
          { schedule: { status: 'PUBLISHED' } },
          { isAdHoc: true },
        ],
        // No clock-in exists
        clockEvents: {
          none: { type: 'CLOCK_IN' },
        },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        location: { select: { name: true } },
      },
    });

    for (const shift of shiftsNeedingClockInReminder) {
      // Check if we already sent a reminder for this shift (dedup via notification service's 15-min window)
      const startTimeStr = new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const locationText = shift.location ? ` at ${shift.location.name}` : '';

      await this.notificationService.createNotification({
        tenantId,
        recipientId: shift.employeeId,
        type: 'MISSING_CLOCK_IN_REMINDER' as any,
        title: 'Missing Clock-In',
        body: `Reminder: You haven't clocked in for your ${startTimeStr} shift${locationText}.`,
        link: '/my-schedule',
      });
      missingClockInReminders++;
    }

    // ─── FR53: Missing employees alert (2+ missing at same shift time → notify manager) ───

    // Group missing shifts by startTime + locationId to find multi-missing scenarios
    const missingByGroup = new Map<string, typeof shiftsNeedingClockInReminder>();
    for (const shift of shiftsNeedingClockInReminder) {
      const key = `${new Date(shift.startTime).toISOString()}|${shift.locationId || 'none'}`;
      const group = missingByGroup.get(key) || [];
      group.push(shift);
      missingByGroup.set(key, group);
    }

    for (const [, groupShifts] of missingByGroup) {
      // AC3: Only fire for 2+ missing employees (single missing handled by individual reminder above)
      if (groupShifts.length < 2) continue;

      const startTimeStr = new Date(groupShifts[0].startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const locationText = groupShifts[0].location ? groupShifts[0].location.name : 'unspecified location';

      // Find managers to notify: department managers of the missing employees + admins
      const departmentIds = new Set<string>();
      for (const s of groupShifts) {
        const emp = await db.employee.findUnique({
          where: { id: s.employeeId },
          select: { departmentId: true },
        });
        if (emp?.departmentId) departmentIds.add(emp.departmentId);
      }

      const managerIds = new Set<string>();
      for (const deptId of departmentIds) {
        const manager = await db.employee.findFirst({
          where: {
            managedDepartments: { some: { id: deptId } },
            status: 'ACTIVE',
          },
          select: { id: true },
        });
        if (manager) managerIds.add(manager.id);
      }

      // Fallback to Super Admins if no managers found
      if (managerIds.size === 0) {
        const superAdmins = await db.employee.findMany({
          where: { systemRole: 'SUPER_ADMIN', status: 'ACTIVE' },
          select: { id: true },
        });
        for (const admin of superAdmins) managerIds.add(admin.id);
      }

      for (const managerId of managerIds) {
        await this.notificationService.createNotification({
          tenantId,
          recipientId: managerId,
          type: 'MISSING_EMPLOYEES' as any,
          title: 'Missing employees alert',
          body: `Alert: ${groupShifts.length} employees haven't clocked in for the ${startTimeStr} shift at ${locationText}`,
          link: '/attendance',
        });
        missingEmployeeAlerts++;
      }
    }

    // ─── AC2: Clock-out warning (shift end + 15min, clocked in but no clock-out) ───

    const clockOutWarningCutoff = new Date(now.getTime() - CLOCK_OUT_WARNING_MINUTES * 60 * 1000);
    // Look for shifts that ended between 15min ago and 30min ago
    const clockOutWarningWindow = new Date(now.getTime() - 30 * 60 * 1000);

    const shiftsNeedingClockOutWarning = await db.shift.findMany({
      where: {
        endTime: {
          gte: clockOutWarningWindow,
          lte: clockOutWarningCutoff,
        },
        OR: [
          { schedule: { status: 'PUBLISHED' } },
          { isAdHoc: true },
        ],
        // Has clock-in but no clock-out
        clockEvents: {
          some: { type: 'CLOCK_IN' },
          none: { type: 'CLOCK_OUT' },
        },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    for (const shift of shiftsNeedingClockOutWarning) {
      await this.notificationService.createNotification({
        tenantId,
        recipientId: shift.employeeId,
        type: 'CLOCK_OUT_WARNING' as any,
        title: 'Clock-Out Reminder',
        body: "You're still clocked in. Don't forget to clock out!",
        link: '/my-schedule',
      });
      clockOutWarnings++;
    }

    // ─── AC3: Auto-clock-out (shift end + 1h, clocked in but no clock-out) ───

    const autoClockOutCutoff = new Date(now.getTime() - AUTO_CLOCK_OUT_MINUTES * 60 * 1000);
    // Look for shifts that ended between 1h ago and 2h ago
    const autoClockOutWindow = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const shiftsNeedingAutoClockOut = await db.shift.findMany({
      where: {
        endTime: {
          gte: autoClockOutWindow,
          lte: autoClockOutCutoff,
        },
        OR: [
          { schedule: { status: 'PUBLISHED' } },
          { isAdHoc: true },
        ],
        // AC5: Has clock-in but no clock-out (duplicate prevention)
        clockEvents: {
          some: { type: 'CLOCK_IN' },
          none: { type: 'CLOCK_OUT' },
        },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    for (const shift of shiftsNeedingAutoClockOut) {
      // AC3: Auto-clock-out timestamp = shift end time + 1 hour
      const autoTimestamp = new Date(new Date(shift.endTime).getTime() + AUTO_CLOCK_OUT_MINUTES * 60 * 1000);

      const clockEvent = await db.clockEvent.create({
        data: {
          tenantId,
          shiftId: shift.id,
          employeeId: shift.employeeId,
          type: 'CLOCK_OUT',
          timestamp: autoTimestamp,
          method: 'AUTO',
          geofenceVerified: false,
          notes: 'Automatic clock-out: no manual clock-out within 1 hour of shift end',
        },
      });

      this.auditLogService.create({
        tenantId,
        action: 'CLOCK_OUT' as any,
        entityType: 'ClockEvent',
        entityId: clockEvent.id,
        newValues: {
          shiftId: shift.id,
          employeeId: shift.employeeId,
          method: 'AUTO',
          autoReason: 'shift_end_plus_1h',
        },
      }).catch(() => {});

      await this.notificationService.createNotification({
        tenantId,
        recipientId: shift.employeeId,
        type: 'AUTO_CLOCK_OUT' as any,
        title: 'Auto Clock-Out',
        body: "You've been automatically clocked out because no manual clock-out was recorded within 1 hour of your shift ending.",
        link: '/my-schedule',
      });

      autoClockOuts++;
    }

    return { missingClockInReminders, clockOutWarnings, autoClockOuts, missingEmployeeAlerts };
  }
}
