import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LeaveReason, LeaveRequestStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class LeaveRequestService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /** FR30/AC1: Get leave balance for an employee (current year) */
  async getLeaveBalance(tenantId: string, employeeId: string) {
    const db = this.prisma.forTenant(tenantId);

    // Get company settings for total allowances
    const settings = await db.companySettings.findFirst({ where: {} });
    const annualTotal = settings?.annualLeaveDefaultDays ?? 20;
    const sickTotal = settings?.sickLeaveDefaultDays ?? 10;

    // Count approved requests in current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

    const approved = await db.leaveRequest.findMany({
      where: {
        employeeId,
        status: LeaveRequestStatus.APPROVED,
        date: { gte: yearStart, lte: yearEnd },
      },
      select: { reason: true },
    });

    const sickUsed = approved.filter((r) => r.reason === 'SICK').length;
    const vacationUsed = approved.filter((r) => r.reason === 'VACATION').length;
    const personalUsed = approved.filter((r) => r.reason === 'PERSONAL').length;
    const otherUsed = approved.filter((r) => r.reason === 'OTHER').length;

    // Annual = vacation + personal + other; Sick = sick
    const annualUsed = vacationUsed + personalUsed + otherUsed;

    // Also count pending requests for context
    const pending = await db.leaveRequest.count({
      where: {
        employeeId,
        status: LeaveRequestStatus.PENDING,
        date: { gte: yearStart, lte: yearEnd },
      },
    });

    return {
      annual: { used: annualUsed, total: annualTotal },
      sick: { used: sickUsed, total: sickTotal },
      pending,
      year: new Date().getFullYear(),
    };
  }

  /** FR26/AC2: Create a day-off request */
  async create(
    tenantId: string,
    employeeId: string,
    dto: { date: string; reason: LeaveReason; notes?: string },
  ) {
    const db = this.prisma.forTenant(tenantId);
    const requestDate = new Date(dto.date);
    requestDate.setHours(0, 0, 0, 0);

    // AC5: Check for shift conflicts (non-blocking)
    const dayStart = new Date(requestDate);
    const dayEnd = new Date(requestDate);
    dayEnd.setHours(23, 59, 59, 999);

    const conflictingShift = await db.shift.findFirst({
      where: {
        employeeId,
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    // AC5 (9.4): Check if request exceeds leave balance (soft warning, not blocking)
    const balance = await this.getLeaveBalance(tenantId, employeeId);
    const isSick = dto.reason === 'SICK';
    const bucket = isSick ? balance.sick : balance.annual;
    const exceedsBalance = bucket.used >= bucket.total;

    const created = await db.leaveRequest.create({
      data: {
        tenantId,
        employeeId,
        date: requestDate,
        reason: dto.reason,
        notes: dto.notes || null,
        hasShiftConflict: !!conflictingShift,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return { ...created, exceedsBalance };
  }

  /** FR70/AC3: Get own leave requests (pending + past) */
  async getMyRequests(tenantId: string, employeeId: string) {
    const db = this.prisma.forTenant(tenantId);

    const requests = await db.leaveRequest.findMany({
      where: { employeeId },
      include: {
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pending = requests.filter(
      (r) => r.status === LeaveRequestStatus.PENDING,
    );
    const past = requests.filter(
      (r) => r.status !== LeaveRequestStatus.PENDING,
    );

    return { pending, past };
  }

  /** AC4: Cancel a pending request */
  async cancel(tenantId: string, employeeId: string, requestId: string) {
    const db = this.prisma.forTenant(tenantId);

    const request = await db.leaveRequest.findFirst({
      where: { id: requestId, employeeId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending requests can be cancelled',
      );
    }

    return db.leaveRequest.update({
      where: { id: requestId },
      data: { status: LeaveRequestStatus.CANCELLED },
      include: {
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /** FR34/AC1: Get pending requests scoped by department */
  async getPendingRequests(tenantId: string, managerId: string, departmentId?: string) {
    const db = this.prisma.forTenant(tenantId);

    // AC6: Department scoping
    const manager = await db.employee.findFirst({
      where: { id: managerId },
      select: { systemRole: true, departmentId: true },
    });

    if (!manager) throw new NotFoundException('Manager not found');

    const isAdmin = manager.systemRole === 'SUPER_ADMIN' || manager.systemRole === 'ADMIN';
    const scopedDepartmentId = isAdmin
      ? departmentId || undefined
      : manager.departmentId || undefined;

    const where: any = {
      status: LeaveRequestStatus.PENDING,
    };

    if (scopedDepartmentId) {
      where.employee = { departmentId: scopedDepartmentId };
    }

    return db.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
    });
  }

  /** FR27/AC2: Approve a leave request */
  async approve(tenantId: string, managerId: string, requestId: string) {
    const db = this.prisma.forTenant(tenantId);

    const request = await db.leaveRequest.findFirst({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Leave request not found');
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    const updated = await db.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveRequestStatus.APPROVED,
        reviewedById: managerId,
        reviewedAt: new Date(),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // AC3 (9.5): Notify employee of approval
    const dateStr = new Date(request.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    this.notificationService.createNotification({
      tenantId,
      recipientId: request.employeeId,
      type: NotificationType.LEAVE_APPROVED,
      title: 'Day off approved',
      body: `Your day off on ${dateStr} has been approved!`,
      link: '/day-off',
    }).catch(() => {});

    return updated;
  }

  /** FR27/AC3: Reject a leave request with reason */
  async reject(
    tenantId: string,
    managerId: string,
    requestId: string,
    reason: string,
  ) {
    const db = this.prisma.forTenant(tenantId);

    const request = await db.leaveRequest.findFirst({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Leave request not found');
    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    if (!reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await db.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveRequestStatus.REJECTED,
        reviewedById: managerId,
        reviewedAt: new Date(),
        rejectionReason: reason.trim(),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // AC3/AC4 (9.5): Notify employee of rejection with reason
    const dateStr = new Date(request.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    this.notificationService.createNotification({
      tenantId,
      recipientId: request.employeeId,
      type: NotificationType.LEAVE_REJECTED,
      title: 'Day off request declined',
      body: `Your day off request for ${dateStr} was declined. Reason: ${reason.trim()}`,
      link: '/day-off',
    }).catch(() => {});

    return updated;
  }

  /** FR31/AC4: Undo an approval or rejection (returns to PENDING) */
  async undo(tenantId: string, managerId: string, requestId: string) {
    const db = this.prisma.forTenant(tenantId);

    const request = await db.leaveRequest.findFirst({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Leave request not found');
    if (
      request.status !== LeaveRequestStatus.APPROVED &&
      request.status !== LeaveRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Only approved or rejected requests can be undone');
    }

    return db.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveRequestStatus.PENDING,
        reviewedById: null,
        reviewedAt: null,
        rejectionReason: null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /** FR28/AC1-3: Coverage impact for a leave request date */
  async getCoverageImpact(tenantId: string, requestId: string) {
    const db = this.prisma.forTenant(tenantId);

    const request = await db.leaveRequest.findFirst({
      where: { id: requestId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, departmentId: true },
        },
      },
    });

    if (!request) throw new NotFoundException('Leave request not found');

    const requestDate = new Date(request.date);
    const dayStart = new Date(requestDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(requestDate);
    dayEnd.setHours(23, 59, 59, 999);

    // 1. Get all shifts on the requested date (same department if applicable)
    const shiftWhere: any = {
      date: { gte: dayStart, lte: dayEnd },
    };
    if (request.employee.departmentId) {
      shiftWhere.employee = { departmentId: request.employee.departmentId };
    }

    const shiftsOnDate = await db.shift.findMany({
      where: shiftWhere,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
        role: { select: { id: true, name: true } },
      },
      orderBy: [{ startTime: 'asc' }],
    });

    // Unique scheduled employees
    const scheduledMap = new Map<string, { id: string; firstName: string; lastName: string; roles: string[] }>();
    for (const shift of shiftsOnDate) {
      const existing = scheduledMap.get(shift.employeeId);
      if (existing) {
        if (!existing.roles.includes(shift.role.name)) {
          existing.roles.push(shift.role.name);
        }
      } else {
        scheduledMap.set(shift.employeeId, {
          ...shift.employee,
          roles: [shift.role.name],
        });
      }
    }
    const scheduledEmployees = Array.from(scheduledMap.values());
    const totalScheduled = scheduledEmployees.length;

    // How many of the requesting employee's shifts are on this day
    const requestEmployeeShifts = shiftsOnDate
      .filter((s) => s.employeeId === request.employeeId)
      .map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        role: s.role.name,
      }));

    const coverageAfterApproval = requestEmployeeShifts.length > 0
      ? totalScheduled - 1
      : totalScheduled;

    // 2. Find approved leave on same date (to exclude from available pool)
    const approvedLeaveOnDate = await db.leaveRequest.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        status: LeaveRequestStatus.APPROVED,
      },
      select: { employeeId: true },
    });
    const onLeaveIds = new Set(approvedLeaveOnDate.map((l) => l.employeeId));

    // 3. Map request date to DayOfWeek enum
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = dayNames[requestDate.getDay()];

    // 4. Find available employees: not scheduled, not on leave, available on this day
    const scheduledIds = Array.from(scheduledMap.keys());
    const excludeIds = [...new Set([...scheduledIds, ...onLeaveIds, request.employeeId])];

    const employeeWhere: any = {
      id: { notIn: excludeIds },
      status: 'ACTIVE',
    };
    if (request.employee.departmentId) {
      employeeWhere.departmentId = request.employee.departmentId;
    }

    const potentialCovers = await db.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        availability: {
          where: { dayOfWeek: dayOfWeek as any },
        },
      },
    });

    // Only include employees who are available on this day (no unavailable entry, or isAvailable=true)
    const availableEmployees = potentialCovers
      .filter((e) => {
        const entry = e.availability[0];
        return !entry || entry.isAvailable;
      })
      .map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }));

    // 5. Warning if coverage drops low
    let warning: string | undefined;
    if (requestEmployeeShifts.length > 0 && totalScheduled > 0) {
      if (coverageAfterApproval <= Math.ceil(totalScheduled * 0.5)) {
        warning = `Approving this request leaves ${coverageAfterApproval} of ${totalScheduled} positions covered on ${requestDate.toISOString().split('T')[0]}`;
      }
    }

    return {
      date: request.date,
      totalScheduled,
      coverageAfterApproval,
      requestEmployeeShifts,
      scheduledEmployees,
      availableEmployees,
      warning,
    };
  }

  /** Get a single request by ID */
  async findOne(tenantId: string, requestId: string) {
    const db = this.prisma.forTenant(tenantId);

    const request = await db.leaveRequest.findFirst({
      where: { id: requestId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            departmentId: true,
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    return request;
  }

  /** FR29/AC1-2 (9.5): Get approved leave dates for a date range */
  async getApprovedLeaves(tenantId: string, startDate: string, endDate: string, employeeId?: string) {
    const db = this.prisma.forTenant(tenantId);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const where: any = {
      status: LeaveRequestStatus.APPROVED,
      date: { gte: start, lte: end },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    return db.leaveRequest.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        date: true,
        reason: true,
      },
      orderBy: { date: 'asc' },
    });
  }
}
