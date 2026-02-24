import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface BreakRule {
  minShiftHours: number;
  breakDurationMinutes: number;
  isPaid: boolean;
}

export interface TimesheetEntry {
  shiftId: string;
  employeeId: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  role: { id: string; name: string; color: string | null; shortCode: string | null } | null;
  location: { id: string; name: string } | null;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledHours: number;
  clockIn: { timestamp: string; method: string } | null;
  clockOut: { timestamp: string; method: string } | null;
  grossHours: number | null;
  breakDeduction: number;
  netHours: number | null;
  isAdHoc: boolean;
  adjustedBy: string | null;
  flags: TimesheetFlag[];
  reviewedAt: string | null;
  reviewedBy: { id: string; firstName: string; lastName: string } | null;
  reviewNote: string | null;
}

export interface TimesheetFlag {
  type: 'HOURS_EXCEED_SHIFT' | 'NEGATIVE_HOURS' | 'MISSING_CLOCK_IN' | 'MISSING_CLOCK_OUT' | 'AUTO_CLOCK_OUT';
  message: string;
}

export interface TimesheetSummary {
  employeeId: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  totalScheduledHours: number;
  totalGrossHours: number;
  totalBreakDeduction: number;
  totalNetHours: number;
  entries: TimesheetEntry[];
  flagCount: number;
  hasUnreviewedFlags: boolean;
}

export interface TimesheetResult {
  periodStart: string;
  periodEnd: string;
  departmentId: string | null;
  summaries: TimesheetSummary[];
  totals: {
    scheduledHours: number;
    grossHours: number;
    breakDeduction: number;
    netHours: number;
    shiftCount: number;
    flagCount: number;
  };
}

@Injectable()
export class TimesheetService {
  constructor(private prisma: PrismaService) {}

  /** FR19/FR20: Compute timesheets for a period */
  async computeTimesheets(
    tenantId: string,
    from: string,
    to: string,
    options?: { employeeId?: string; departmentId?: string },
  ): Promise<TimesheetResult> {
    const db = this.prisma.forTenant(tenantId);
    const periodStart = new Date(from);
    const periodEnd = new Date(to);
    periodEnd.setHours(23, 59, 59, 999);

    // Fetch settings for fallback break rules (ad-hoc shifts without schedule)
    const settings = await db.companySettings.findFirst();
    const defaultBreakRules: BreakRule[] = Array.isArray(settings?.breakRules)
      ? (settings.breakRules as unknown as BreakRule[])
      : [];

    // Build shift query
    const shiftWhere: any = {
      date: { gte: periodStart, lte: periodEnd },
    };

    if (options?.employeeId) {
      shiftWhere.employeeId = options.employeeId;
    }

    if (options?.departmentId) {
      shiftWhere.employee = { departmentId: options.departmentId };
    }

    const shifts = await db.shift.findMany({
      where: shiftWhere,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        role: { select: { id: true, name: true, color: true, shortCode: true } },
        location: { select: { id: true, name: true } },
        schedule: {
          select: { id: true, breakRulesSnapshot: true },
        },
        clockEvents: {
          where: { originalEventId: null }, // Only primary events
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            type: true,
            timestamp: true,
            method: true,
            adjustedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        timesheetReview: {
          select: {
            reviewedAt: true,
            note: true,
            reviewedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
    });

    // Compute entries
    const entries: TimesheetEntry[] = shifts.map((shift) => {
      const scheduledStart = new Date(shift.startTime);
      const scheduledEnd = new Date(shift.endTime);
      const scheduledHours = (scheduledEnd.getTime() - scheduledStart.getTime()) / 3600000;

      const clockIn = shift.clockEvents.find((e) => e.type === 'CLOCK_IN');
      const clockOut = shift.clockEvents.find((e) => e.type === 'CLOCK_OUT');

      // AC6: Use the latest event timestamps (adjusted ones are separate records via Story 7.1)
      let grossHours: number | null = null;
      if (clockIn && clockOut) {
        grossHours = (new Date(clockOut.timestamp).getTime() - new Date(clockIn.timestamp).getTime()) / 3600000;
        grossHours = Math.round(grossHours * 100) / 100;
      }

      // AC2/AC3: Break deduction rules
      const breakRules = this.getBreakRules(shift.schedule?.breakRulesSnapshot, defaultBreakRules);
      const breakDeduction = grossHours !== null
        ? this.computeBreakDeduction(grossHours, breakRules)
        : 0;

      // AC1: Net hours
      const netHours = grossHours !== null
        ? Math.round((grossHours - breakDeduction) * 100) / 100
        : null;

      // AC4/AC5: Validation flags
      const flags: TimesheetFlag[] = [];

      if (netHours !== null && netHours > scheduledHours + 0.1) {
        flags.push({
          type: 'HOURS_EXCEED_SHIFT',
          message: `Hours (${netHours.toFixed(2)}h) exceed scheduled shift (${scheduledHours.toFixed(2)}h)`,
        });
      }

      if (netHours !== null && netHours < 0) {
        flags.push({
          type: 'NEGATIVE_HOURS',
          message: 'Negative hours detected — review required',
        });
      }

      if (!clockIn && new Date(shift.startTime) < new Date()) {
        flags.push({
          type: 'MISSING_CLOCK_IN',
          message: 'No clock-in recorded for this shift',
        });
      }

      if (clockIn && !clockOut && new Date(shift.endTime) < new Date()) {
        flags.push({
          type: 'MISSING_CLOCK_OUT',
          message: 'No clock-out recorded for this shift',
        });
      }

      if (clockOut && clockOut.method === 'AUTO') {
        flags.push({
          type: 'AUTO_CLOCK_OUT',
          message: 'Automatic clock-out — verify actual departure time',
        });
      }

      // AC6: Track adjustment attribution
      const adjuster = clockIn?.adjustedBy || clockOut?.adjustedBy;
      const adjustedBy = adjuster ? `${adjuster.firstName} ${adjuster.lastName}` : null;

      const review = (shift as any).timesheetReview;

      return {
        shiftId: shift.id,
        employeeId: shift.employeeId,
        employee: shift.employee,
        role: shift.role,
        location: shift.location,
        date: shift.date.toISOString(),
        scheduledStart: shift.startTime.toISOString(),
        scheduledEnd: shift.endTime.toISOString(),
        scheduledHours: Math.round(scheduledHours * 100) / 100,
        clockIn: clockIn ? { timestamp: clockIn.timestamp.toISOString(), method: clockIn.method } : null,
        clockOut: clockOut ? { timestamp: clockOut.timestamp.toISOString(), method: clockOut.method } : null,
        grossHours,
        breakDeduction: Math.round(breakDeduction * 100) / 100,
        netHours,
        isAdHoc: shift.isAdHoc,
        adjustedBy,
        flags,
        reviewedAt: review?.reviewedAt ? review.reviewedAt.toISOString() : null,
        reviewedBy: review?.reviewedBy || null,
        reviewNote: review?.note || null,
      };
    });

    // Group by employee for summaries
    const byEmployee = new Map<string, TimesheetEntry[]>();
    for (const entry of entries) {
      const existing = byEmployee.get(entry.employeeId) || [];
      existing.push(entry);
      byEmployee.set(entry.employeeId, existing);
    }

    const summaries: TimesheetSummary[] = Array.from(byEmployee.entries()).map(([employeeId, empEntries]) => {
      const totalScheduledHours = empEntries.reduce((sum, e) => sum + e.scheduledHours, 0);
      const totalGrossHours = empEntries.reduce((sum, e) => sum + (e.grossHours || 0), 0);
      const totalBreakDeduction = empEntries.reduce((sum, e) => sum + e.breakDeduction, 0);
      const totalNetHours = empEntries.reduce((sum, e) => sum + (e.netHours || 0), 0);
      const flagCount = empEntries.reduce((sum, e) => sum + e.flags.length, 0);

      const unreviewedFlagCount = empEntries.reduce(
        (sum, e) => sum + (e.flags.length > 0 && !e.reviewedAt ? e.flags.length : 0),
        0,
      );

      return {
        employeeId,
        employee: empEntries[0].employee,
        totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
        totalGrossHours: Math.round(totalGrossHours * 100) / 100,
        totalBreakDeduction: Math.round(totalBreakDeduction * 100) / 100,
        totalNetHours: Math.round(totalNetHours * 100) / 100,
        entries: empEntries,
        flagCount,
        hasUnreviewedFlags: unreviewedFlagCount > 0,
      };
    });

    // Totals
    const totals = {
      scheduledHours: Math.round(summaries.reduce((s, e) => s + e.totalScheduledHours, 0) * 100) / 100,
      grossHours: Math.round(summaries.reduce((s, e) => s + e.totalGrossHours, 0) * 100) / 100,
      breakDeduction: Math.round(summaries.reduce((s, e) => s + e.totalBreakDeduction, 0) * 100) / 100,
      netHours: Math.round(summaries.reduce((s, e) => s + e.totalNetHours, 0) * 100) / 100,
      shiftCount: entries.length,
      flagCount: summaries.reduce((s, e) => s + e.flagCount, 0),
    };

    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      departmentId: options?.departmentId || null,
      summaries,
      totals,
    };
  }

  /** AC3: Get break rules from schedule snapshot, falling back to settings */
  private getBreakRules(snapshot: any, defaultRules: BreakRule[]): BreakRule[] {
    if (snapshot && Array.isArray(snapshot)) {
      return snapshot as BreakRule[];
    }
    return defaultRules;
  }

  /** AC2: Apply break deductions based on shift duration */
  private computeBreakDeduction(grossHours: number, rules: BreakRule[]): number {
    if (!rules.length) return 0;

    // Find the matching rule: use the highest-threshold rule that applies
    // Rules sorted by minShiftHours descending to find best match
    const sorted = [...rules].sort((a, b) => b.minShiftHours - a.minShiftHours);
    for (const rule of sorted) {
      if (grossHours >= rule.minShiftHours && !rule.isPaid) {
        return rule.breakDurationMinutes / 60;
      }
    }
    return 0;
  }

  /** Get timesheet for a single employee */
  async getEmployeeTimesheet(
    tenantId: string,
    employeeId: string,
    from: string,
    to: string,
  ): Promise<TimesheetSummary | null> {
    const result = await this.computeTimesheets(tenantId, from, to, { employeeId });
    return result.summaries.find((s) => s.employeeId === employeeId) || null;
  }

  /** AC3: Mark a shift's timesheet flags as reviewed */
  async reviewShift(
    tenantId: string,
    managerId: string,
    shiftId: string,
    note?: string,
  ) {
    const db = this.prisma.forTenant(tenantId);

    // Verify shift exists in this tenant
    const shift = await db.shift.findFirst({ where: { id: shiftId } });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Upsert: if already reviewed, update; otherwise create
    return db.timesheetReview.upsert({
      where: { shiftId },
      create: {
        tenantId,
        shiftId,
        reviewedById: managerId,
        note: note || null,
      },
      update: {
        reviewedById: managerId,
        note: note || null,
        reviewedAt: new Date(),
      },
    });
  }

  /** Batch review all flagged shifts for an employee in a period */
  async reviewEmployeeShifts(
    tenantId: string,
    managerId: string,
    employeeId: string,
    from: string,
    to: string,
    note?: string,
  ) {
    const db = this.prisma.forTenant(tenantId);
    const periodStart = new Date(from);
    const periodEnd = new Date(to);
    periodEnd.setHours(23, 59, 59, 999);

    // Find all shifts for the employee in this period that have flags (compute to check)
    const result = await this.getEmployeeTimesheet(tenantId, employeeId, from, to);
    if (!result) return { reviewed: 0 };

    const flaggedShiftIds = result.entries
      .filter((e) => e.flags.length > 0 && !e.reviewedAt)
      .map((e) => e.shiftId);

    if (flaggedShiftIds.length === 0) return { reviewed: 0 };

    // Create reviews for all flagged shifts
    let count = 0;
    for (const shiftId of flaggedShiftIds) {
      await db.timesheetReview.upsert({
        where: { shiftId },
        create: {
          tenantId,
          shiftId,
          reviewedById: managerId,
          note: note || null,
        },
        update: {
          reviewedById: managerId,
          note: note || null,
          reviewedAt: new Date(),
        },
      });
      count++;
    }

    return { reviewed: count };
  }

  /** FR57: Get timesheets scoped to manager's department */
  async getManagerTimesheets(
    tenantId: string,
    managerId: string,
    from: string,
    to: string,
    departmentId?: string,
  ): Promise<TimesheetResult> {
    const db = this.prisma.forTenant(tenantId);
    const manager = await db.employee.findFirst({
      where: { id: managerId },
      select: { systemRole: true, departmentId: true },
    });

    if (!manager) throw new NotFoundException('Manager not found');

    // Super admins and admins can see all or filter by department
    const isAdmin = manager.systemRole === 'SUPER_ADMIN' || manager.systemRole === 'ADMIN';
    const scopedDepartmentId = isAdmin
      ? departmentId || undefined
      : manager.departmentId || undefined;

    return this.computeTimesheets(tenantId, from, to, { departmentId: scopedDepartmentId });
  }

  /** FR24: Generate CSV content for payroll export */
  generateCsv(result: TimesheetResult): string {
    const lines: string[] = [];
    // AC4: Properly delimited columns with all required fields
    lines.push([
      'Employee ID',
      'Employee Name',
      'Employee Email',
      'Date',
      'Scheduled Start',
      'Scheduled End',
      'Scheduled Hours',
      'Clock In',
      'Clock Out',
      'Gross Hours',
      'Break Deduction',
      'Net Hours',
      'Method',
      'Adjusted By',
      'Flags',
      'Reviewed',
    ].join(','));

    for (const summary of result.summaries) {
      for (const entry of summary.entries) {
        const method = entry.clockOut?.method || entry.clockIn?.method || '';
        // AC4: ISO date format (YYYY-MM-DD), decimal hours (e.g. 7.75)
        lines.push([
          entry.employeeId,
          `"${entry.employee.firstName} ${entry.employee.lastName}"`,
          entry.employee.email,
          entry.date.split('T')[0],
          entry.scheduledStart.split('T')[0] + 'T' + new Date(entry.scheduledStart).toISOString().split('T')[1],
          entry.scheduledEnd.split('T')[0] + 'T' + new Date(entry.scheduledEnd).toISOString().split('T')[1],
          entry.scheduledHours.toFixed(2),
          entry.clockIn ? new Date(entry.clockIn.timestamp).toISOString() : '',
          entry.clockOut ? new Date(entry.clockOut.timestamp).toISOString() : '',
          entry.grossHours !== null ? entry.grossHours.toFixed(2) : '',
          entry.breakDeduction.toFixed(2),
          entry.netHours !== null ? entry.netHours.toFixed(2) : '',
          method,
          entry.adjustedBy || '',
          entry.flags.length > 0 ? `"${entry.flags.map((f) => f.type).join('; ')}"` : '',
          entry.reviewedAt ? 'Yes' : '',
        ].join(','));
      }

      // AC1: Summary row per employee with totals
      lines.push([
        summary.employeeId,
        `"${summary.employee.firstName} ${summary.employee.lastName} (TOTAL)"`,
        summary.employee.email,
        `${result.periodStart.split('T')[0]} to ${result.periodEnd.split('T')[0]}`,
        '', // scheduled start
        '', // scheduled end
        summary.totalScheduledHours.toFixed(2),
        '', // clock in
        '', // clock out
        summary.totalGrossHours.toFixed(2),
        summary.totalBreakDeduction.toFixed(2),
        summary.totalNetHours.toFixed(2),
        '', // method
        '', // adjusted by
        summary.flagCount > 0 ? `"${summary.flagCount} flags"` : '',
        '', // reviewed
      ].join(','));
    }

    return lines.join('\n');
  }

  /** Count unreviewed flags across all summaries */
  countUnreviewedFlags(result: TimesheetResult): number {
    return result.summaries.reduce(
      (total, summary) =>
        total +
        summary.entries.reduce(
          (sum, e) => sum + (e.flags.length > 0 && !e.reviewedAt ? e.flags.length : 0),
          0,
        ),
      0,
    );
  }
}
