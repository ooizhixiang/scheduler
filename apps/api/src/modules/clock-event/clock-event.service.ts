import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationService } from '../notification/notification.service';
import { ClockInDto, ClockOutDto, AdHocClockInDto, CreateManualClockEventDto, AdjustClockEventDto } from './dto';

const CLOCK_IN_WINDOW_MINUTES = 15;
const RATE_LIMIT_SECONDS = 60;
const OFFLINE_TOLERANCE_HOURS = 24;

/** Haversine distance in meters between two lat/lng points */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class ClockEventService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private notificationService: NotificationService,
  ) {}

  async clockIn(tenantId: string, employeeId: string, dto: ClockInDto) {
    const db = this.prisma.forTenant(tenantId);

    // Validate shift exists and belongs to employee
    const shift = await db.shift.findFirst({
      where: { id: dto.shiftId, employeeId },
      include: {
        location: { select: { id: true, name: true, latitude: true, longitude: true, geofenceRadius: true } },
        role: { select: { id: true, name: true, color: true, shortCode: true } },
        schedule: { select: { id: true, status: true } },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.schedule && shift.schedule.status !== 'PUBLISHED') {
      throw new BadRequestException('Cannot clock into an unpublished schedule');
    }

    // AC4 (Story 6.4): Resolve event timestamp — use client timestamp for offline replay
    const now = new Date();
    let eventTimestamp = now;
    let receivedAt: Date | undefined;

    if (dto.timestamp) {
      const clientTime = new Date(dto.timestamp);
      const drift = Math.abs(now.getTime() - clientTime.getTime());
      if (drift > OFFLINE_TOLERANCE_HOURS * 60 * 60 * 1000) {
        throw new BadRequestException(
          `Offline clock-in too old. Events must be synced within ${OFFLINE_TOLERANCE_HOURS} hours.`,
        );
      }
      eventTimestamp = clientTime;
      receivedAt = now;
    }

    // AC1: Check clock-in window (15 min before shift start)
    const shiftStart = new Date(shift.startTime);
    const windowStart = new Date(shiftStart.getTime() - CLOCK_IN_WINDOW_MINUTES * 60 * 1000);
    const shiftEnd = new Date(shift.endTime);

    if (eventTimestamp < windowStart) {
      const minutesUntil = Math.ceil((windowStart.getTime() - eventTimestamp.getTime()) / 60000);
      throw new BadRequestException(
        `Clock-in opens ${minutesUntil} minute${minutesUntil > 1 ? 's' : ''} before your shift starts`,
      );
    }

    if (eventTimestamp > shiftEnd) {
      throw new BadRequestException('This shift has already ended');
    }

    // AC5: Rate limit — 60 seconds between clock-in attempts (skip for offline replay)
    if (!dto.timestamp) {
      const recentEvent = await db.clockEvent.findFirst({
        where: {
          employeeId,
          type: 'CLOCK_IN',
          timestamp: { gte: new Date(now.getTime() - RATE_LIMIT_SECONDS * 1000) },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (recentEvent) {
        throw new BadRequestException('Please wait before clocking in again');
      }
    }

    // Check no existing clock-in for this shift
    const existingClockIn = await db.clockEvent.findFirst({
      where: { shiftId: dto.shiftId, type: 'CLOCK_IN' },
    });

    if (existingClockIn) {
      throw new BadRequestException('Already clocked in for this shift');
    }

    // AC2, AC3: GPS geofence verification
    let geofenceVerified = false;
    if (
      dto.latitude != null && dto.longitude != null &&
      shift.location?.latitude != null && shift.location?.longitude != null &&
      shift.location?.geofenceRadius
    ) {
      const distance = haversineDistance(
        dto.latitude, dto.longitude,
        shift.location.latitude, shift.location.longitude,
      );
      geofenceVerified = distance <= shift.location.geofenceRadius;

      // Log GPS verification result for monitoring (AC5 of Story 6.3)
      this.logGpsVerification(
        tenantId, shift.location.id, geofenceVerified, distance,
      ).catch(() => {});

      if (!geofenceVerified) {
        throw new BadRequestException({
          message: `You appear to be outside your work location. Move closer to ${shift.location.name} and try again.`,
          code: 'OUTSIDE_GEOFENCE',
          distance: Math.round(distance),
          geofenceRadius: shift.location.geofenceRadius,
          locationName: shift.location.name,
          locationLat: shift.location.latitude,
          locationLng: shift.location.longitude,
          userLat: dto.latitude,
          userLng: dto.longitude,
        } as any);
      }
    } else {
      // No location or no GPS — allow clock-in without geofence
      geofenceVerified = !shift.location?.geofenceRadius;
    }

    // AC3: Create ClockEvent
    const clockEvent = await db.clockEvent.create({
      data: {
        tenantId,
        shiftId: dto.shiftId,
        employeeId,
        type: 'CLOCK_IN',
        timestamp: eventTimestamp,
        receivedAt,
        latitude: dto.latitude,
        longitude: dto.longitude,
        geofenceVerified,
        method: 'GPS',
      },
    });

    this.auditLogService.create({
      tenantId,
      actorId: employeeId,
      action: 'CLOCK_IN' as any,
      entityType: 'ClockEvent',
      entityId: clockEvent.id,
      newValues: { shiftId: dto.shiftId, geofenceVerified },
    }).catch(() => {});

    // FR54: Check if all employees for this shift time are now clocked in → all-clear
    this.checkAllClear(tenantId, shift).catch(() => {});

    return {
      ...clockEvent,
      shift: {
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        role: shift.role,
        location: shift.location,
      },
    };
  }

  /**
   * FR54: After a clock-in, check if all employees scheduled for the same
   * shift start time (+ location) have now clocked in. If so, notify the manager.
   */
  private async checkAllClear(tenantId: string, shift: any) {
    const db = this.prisma.forTenant(tenantId);

    // Find all shifts at the same start time, date, and location in published schedules
    const siblingShifts = await db.shift.findMany({
      where: {
        startTime: shift.startTime,
        date: shift.date,
        locationId: shift.locationId,
        OR: [
          { schedule: { status: 'PUBLISHED' } },
          { isAdHoc: true },
        ],
      },
      select: {
        id: true,
        employeeId: true,
        clockEvents: {
          where: { type: 'CLOCK_IN' },
          select: { id: true },
        },
      },
    });

    if (siblingShifts.length < 2) return; // No all-clear for single-person shifts

    // Check if every shift has at least one clock-in
    const allClockedIn = siblingShifts.every((s) => s.clockEvents.length > 0);
    if (!allClockedIn) return;

    const startTimeStr = new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const locationName = shift.location?.name || shift.locationId;

    // Find manager(s) for the employees' departments
    const employeeIds = siblingShifts.map((s) => s.employeeId);
    const employees = await db.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { departmentId: true },
    });

    const departmentIds = new Set<string>();
    for (const emp of employees) {
      if (emp.departmentId) departmentIds.add(emp.departmentId);
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

    // Fallback to Super Admins
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
        type: 'ALL_CLEAR' as any,
        title: 'All clear',
        body: `All clear: All ${siblingShifts.length} employees have clocked in for the ${startTimeStr} shift${locationName ? ` at ${locationName}` : ''}`,
        link: '/attendance',
      });
    }
  }

  async clockOut(tenantId: string, employeeId: string, dto: ClockOutDto) {
    const db = this.prisma.forTenant(tenantId);

    // Validate shift
    const shift = await db.shift.findFirst({
      where: { id: dto.shiftId, employeeId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Must have clocked in first
    const clockIn = await db.clockEvent.findFirst({
      where: { shiftId: dto.shiftId, type: 'CLOCK_IN' },
    });

    if (!clockIn) {
      throw new BadRequestException('Must clock in before clocking out');
    }

    // Check no existing clock-out
    const existingClockOut = await db.clockEvent.findFirst({
      where: { shiftId: dto.shiftId, type: 'CLOCK_OUT' },
    });

    if (existingClockOut) {
      throw new BadRequestException('Already clocked out for this shift');
    }

    // AC4 (Story 6.4): Resolve event timestamp for offline replay
    const now = new Date();
    let eventTimestamp = now;
    let receivedAt: Date | undefined;

    if (dto.timestamp) {
      const clientTime = new Date(dto.timestamp);
      const drift = Math.abs(now.getTime() - clientTime.getTime());
      if (drift > OFFLINE_TOLERANCE_HOURS * 60 * 60 * 1000) {
        throw new BadRequestException(
          `Offline clock-out too old. Events must be synced within ${OFFLINE_TOLERANCE_HOURS} hours.`,
        );
      }
      eventTimestamp = clientTime;
      receivedAt = now;
    }

    // Rate limit — 60 seconds between clock-out attempts (skip for offline replay)
    if (!dto.timestamp) {
      const recentClockOut = await db.clockEvent.findFirst({
        where: {
          employeeId,
          type: 'CLOCK_OUT',
          timestamp: { gte: new Date(now.getTime() - RATE_LIMIT_SECONDS * 1000) },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (recentClockOut) {
        throw new BadRequestException('Please wait before clocking out again');
      }
    }

    const clockEvent = await db.clockEvent.create({
      data: {
        tenantId,
        shiftId: dto.shiftId,
        employeeId,
        type: 'CLOCK_OUT',
        timestamp: eventTimestamp,
        receivedAt,
        latitude: dto.latitude,
        longitude: dto.longitude,
        geofenceVerified: false,
        method: 'GPS',
      },
    });

    this.auditLogService.create({
      tenantId,
      actorId: employeeId,
      action: 'CLOCK_OUT' as any,
      entityType: 'ClockEvent',
      entityId: clockEvent.id,
      newValues: { shiftId: dto.shiftId, offlineReplay: !!dto.timestamp },
    }).catch(() => {});

    return clockEvent;
  }

  /** AC1-AC3 (Story 6.5): Ad-hoc clock-in for unscheduled shifts */
  async adhocClockIn(tenantId: string, employeeId: string, dto: AdHocClockInDto) {
    const db = this.prisma.forTenant(tenantId);
    const now = new Date();

    // Resolve event timestamp for offline replay
    let eventTimestamp = now;
    let receivedAt: Date | undefined;

    if (dto.timestamp) {
      const clientTime = new Date(dto.timestamp);
      const drift = Math.abs(now.getTime() - clientTime.getTime());
      if (drift > OFFLINE_TOLERANCE_HOURS * 60 * 60 * 1000) {
        throw new BadRequestException(
          `Offline clock-in too old. Events must be synced within ${OFFLINE_TOLERANCE_HOURS} hours.`,
        );
      }
      eventTimestamp = clientTime;
      receivedAt = now;
    }

    // Rate limit — 60 seconds between clock-in attempts
    if (!dto.timestamp) {
      const recentEvent = await db.clockEvent.findFirst({
        where: {
          employeeId,
          type: 'CLOCK_IN',
          timestamp: { gte: new Date(now.getTime() - RATE_LIMIT_SECONDS * 1000) },
        },
        orderBy: { timestamp: 'desc' },
      });
      if (recentEvent) {
        throw new BadRequestException('Please wait before clocking in again');
      }
    }

    // Check no existing active (non-clocked-out) ad-hoc shift today
    const todayStart = new Date(eventTimestamp);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const existingAdHoc = await db.shift.findFirst({
      where: {
        employeeId,
        isAdHoc: true,
        date: { gte: todayStart, lt: todayEnd },
        clockEvents: { none: { type: 'CLOCK_OUT' } },
      },
      include: { clockEvents: true },
    });

    if (existingAdHoc?.clockEvents?.some((e: any) => e.type === 'CLOCK_IN')) {
      throw new BadRequestException('You already have an active ad-hoc clock-in today');
    }

    // Resolve employee for notification
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true, lastName: true, departmentId: true },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    // Resolve role — use provided or employee's first assigned role
    let roleId = dto.roleId;
    if (!roleId) {
      const firstRole = await db.role.findFirst({ where: { tenantId } });
      if (!firstRole) throw new BadRequestException('No roles configured. Ask your manager to add roles first.');
      roleId = firstRole.id;
    }

    // Geofence check if location and GPS provided
    let location: any = null;
    let geofenceVerified = false;

    if (dto.locationId) {
      location = await db.location.findFirst({
        where: { id: dto.locationId, tenantId },
        select: { id: true, name: true, latitude: true, longitude: true, geofenceRadius: true },
      });
    }

    if (
      dto.latitude != null && dto.longitude != null &&
      location?.latitude != null && location?.longitude != null &&
      location?.geofenceRadius
    ) {
      const distance = haversineDistance(
        dto.latitude, dto.longitude,
        location.latitude, location.longitude,
      );
      geofenceVerified = distance <= location.geofenceRadius;

      this.logGpsVerification(tenantId, location.id, geofenceVerified, distance).catch(() => {});

      if (!geofenceVerified) {
        throw new BadRequestException({
          message: `You appear to be outside your work location. Move closer to ${location.name} and try again.`,
          code: 'OUTSIDE_GEOFENCE',
          distance: Math.round(distance),
          geofenceRadius: location.geofenceRadius,
          locationName: location.name,
        } as any);
      }
    }

    // Create ad-hoc shift (8-hour default duration, endTime adjusted on clock-out)
    const defaultEndTime = new Date(eventTimestamp.getTime() + 8 * 60 * 60 * 1000);
    const shift = await db.shift.create({
      data: {
        tenantId,
        employeeId,
        roleId,
        locationId: dto.locationId || null,
        date: eventTimestamp,
        startTime: eventTimestamp,
        endTime: defaultEndTime,
        isAdHoc: true,
        notes: dto.notes || 'Ad-hoc shift',
      },
    });

    // Create clock event
    const clockEvent = await db.clockEvent.create({
      data: {
        tenantId,
        shiftId: shift.id,
        employeeId,
        type: 'CLOCK_IN',
        timestamp: eventTimestamp,
        receivedAt,
        latitude: dto.latitude,
        longitude: dto.longitude,
        geofenceVerified,
        isAdHoc: true,
        method: 'GPS',
      },
    });

    this.auditLogService.create({
      tenantId,
      actorId: employeeId,
      action: 'CLOCK_IN' as any,
      entityType: 'ClockEvent',
      entityId: clockEvent.id,
      newValues: { shiftId: shift.id, isAdHoc: true, geofenceVerified },
    }).catch(() => {});

    // AC3: Notify department manager
    this.notifyManagerOfAdHoc(tenantId, employeeId, employee, location).catch(() => {});

    return {
      ...clockEvent,
      shift: {
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        isAdHoc: true,
        location,
      },
    };
  }

  /** AC3: Send manager notification for ad-hoc clock-in */
  private async notifyManagerOfAdHoc(
    tenantId: string,
    employeeId: string,
    employee: { firstName: string; lastName: string; departmentId: string | null },
    location: { name: string } | null,
  ) {
    if (!employee.departmentId) return;

    const db = this.prisma.forTenant(tenantId);
    const dept = await db.department.findUnique({
      where: { id: employee.departmentId },
      select: { managerId: true },
    });

    if (!dept?.managerId) return;

    const locationText = location ? ` at ${location.name}` : '';
    await this.notificationService.createNotification({
      tenantId,
      recipientId: dept.managerId,
      type: 'ADHOC_CLOCK_IN' as any,
      title: 'Unscheduled Clock-In',
      body: `${employee.firstName} ${employee.lastName} clocked in for an unscheduled shift${locationText}.`,
      link: '/schedules',
    });
  }

  /** Get clock events for a specific shift */
  async getByShift(tenantId: string, shiftId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.clockEvent.findMany({
      where: { shiftId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /** Get clock events for an employee (for my-schedule enrichment) */
  async getByEmployee(tenantId: string, employeeId: string, shiftIds: string[]) {
    if (shiftIds.length === 0) return [];
    const db = this.prisma.forTenant(tenantId);
    return db.clockEvent.findMany({
      where: { employeeId, shiftId: { in: shiftIds } },
      orderBy: { timestamp: 'asc' },
    });
  }

  // ─── Story 7.1: Manager Clock Event Adjustments ───────────────────────────

  /** AC1/AC2: Manager creates a manual clock event for an employee */
  async createManualClockEvent(tenantId: string, managerId: string, dto: CreateManualClockEventDto) {
    const db = this.prisma.forTenant(tenantId);

    // Validate shift exists and belongs to the employee
    const shift = await db.shift.findFirst({
      where: { id: dto.shiftId, employeeId: dto.employeeId },
    });
    if (!shift) throw new NotFoundException('Shift not found for this employee');

    // Check for duplicate (same type for same shift)
    const existing = await db.clockEvent.findFirst({
      where: { shiftId: dto.shiftId, type: dto.type, originalEventId: null },
    });
    if (existing) {
      throw new BadRequestException(
        `A ${dto.type === 'CLOCK_IN' ? 'clock-in' : 'clock-out'} already exists for this shift. Use "Adjust" to modify it.`,
      );
    }

    // If creating a clock-out, ensure a clock-in exists
    if (dto.type === 'CLOCK_OUT') {
      const clockInExists = await db.clockEvent.findFirst({
        where: { shiftId: dto.shiftId, type: 'CLOCK_IN' },
      });
      if (!clockInExists) {
        throw new BadRequestException('Cannot create a clock-out without a clock-in. Create a clock-in first.');
      }
    }

    const clockEvent = await db.clockEvent.create({
      data: {
        tenantId,
        shiftId: dto.shiftId,
        employeeId: dto.employeeId,
        type: dto.type,
        timestamp: new Date(dto.timestamp),
        method: 'MANUAL',
        reason: dto.reason,
        notes: dto.notes,
        adjustedById: managerId,
        geofenceVerified: false,
      },
    });

    // Fetch manager name for audit
    const manager = await db.employee.findUnique({
      where: { id: managerId },
      select: { firstName: true, lastName: true },
    });

    this.auditLogService.create({
      tenantId,
      actorId: managerId,
      action: 'CREATE' as any,
      entityType: 'ClockEvent',
      entityId: clockEvent.id,
      newValues: {
        type: dto.type,
        shiftId: dto.shiftId,
        employeeId: dto.employeeId,
        method: 'MANUAL',
        reason: dto.reason,
        managerName: manager ? `${manager.firstName} ${manager.lastName}` : managerId,
      },
    }).catch(() => {});

    return clockEvent;
  }

  /** AC3: Manager adjusts an existing clock event (immutable original, new adjustment record) */
  async adjustClockEvent(tenantId: string, managerId: string, eventId: string, dto: AdjustClockEventDto) {
    const db = this.prisma.forTenant(tenantId);

    const original = await db.clockEvent.findFirst({
      where: { id: eventId, tenantId },
      include: { shift: true },
    });

    if (!original) throw new NotFoundException('Clock event not found');

    // Create adjustment event referencing the original (original stays immutable)
    const adjustment = await db.clockEvent.create({
      data: {
        tenantId,
        shiftId: original.shiftId,
        employeeId: original.employeeId,
        type: original.type,
        timestamp: new Date(dto.timestamp),
        method: 'MANUAL',
        reason: dto.reason,
        notes: dto.notes,
        adjustedById: managerId,
        originalEventId: original.id,
        geofenceVerified: false,
      },
    });

    const manager = await db.employee.findUnique({
      where: { id: managerId },
      select: { firstName: true, lastName: true },
    });

    this.auditLogService.create({
      tenantId,
      actorId: managerId,
      action: 'UPDATE' as any,
      entityType: 'ClockEvent',
      entityId: adjustment.id,
      oldValues: { timestamp: original.timestamp, method: original.method },
      newValues: {
        timestamp: dto.timestamp,
        method: 'MANUAL',
        reason: dto.reason,
        originalEventId: original.id,
        managerName: manager ? `${manager.firstName} ${manager.lastName}` : managerId,
      },
    }).catch(() => {});

    return adjustment;
  }

  /** AC4: Get clock events for an employee with adjustment attribution */
  async getEmployeeClockHistory(tenantId: string, employeeId: string, from?: string, to?: string) {
    const db = this.prisma.forTenant(tenantId);

    const where: any = { tenantId, employeeId };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    return db.clockEvent.findMany({
      where,
      include: {
        shift: {
          select: {
            id: true, date: true, startTime: true, endTime: true, isAdHoc: true,
            role: { select: { id: true, name: true, color: true, shortCode: true } },
            location: { select: { id: true, name: true } },
          },
        },
        adjustedBy: { select: { id: true, firstName: true, lastName: true } },
        originalEvent: { select: { id: true, timestamp: true, method: true } },
        adjustments: {
          select: { id: true, timestamp: true, adjustedById: true, reason: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ─── Story 7.3: Team Attendance StatusBoard ─────────────────────────────────

  /** FR56: Get team attendance status for today's shifts */
  async getTeamAttendance(tenantId: string, managerId: string, departmentId?: string) {
    const db = this.prisma.forTenant(tenantId);
    const now = new Date();

    // Determine scope: manager sees their department, admin/super_admin sees all (or filtered)
    const manager = await db.employee.findUnique({
      where: { id: managerId },
      select: { systemRole: true, departmentId: true },
    });

    if (!manager) throw new NotFoundException('Manager not found');

    // FR57: Department scoping
    let scopeDepartmentId: string | undefined = departmentId;
    if (manager.systemRole === 'MANAGER' && !scopeDepartmentId) {
      // Manager defaults to their own department
      scopeDepartmentId = manager.departmentId || undefined;
    }

    // Get today's shifts
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const shiftWhere: any = {
      date: { gte: todayStart, lt: todayEnd },
      OR: [
        { schedule: { status: 'PUBLISHED' } },
        { isAdHoc: true },
      ],
    };

    if (scopeDepartmentId) {
      shiftWhere.employee = { departmentId: scopeDepartmentId };
    }

    const shifts = await db.shift.findMany({
      where: shiftWhere,
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
          },
        },
        role: { select: { id: true, name: true, color: true, shortCode: true } },
        location: { select: { id: true, name: true } },
        clockEvents: {
          where: { originalEventId: null }, // Only primary events, not adjustments
          orderBy: { timestamp: 'asc' },
          select: { id: true, type: true, timestamp: true, method: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Compute attendance status for each shift
    const attendanceEntries = shifts.map((shift) => {
      const clockIn = shift.clockEvents.find((e) => e.type === 'CLOCK_IN');
      const clockOut = shift.clockEvents.find((e) => e.type === 'CLOCK_OUT');
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);

      let status: 'ON_TIME' | 'LATE' | 'MISSING' | 'CLOCKED_OUT' | 'NOT_STARTED';

      if (clockOut) {
        status = 'CLOCKED_OUT';
      } else if (clockIn) {
        // Grace period: 5 minutes after shift start
        const graceEnd = new Date(shiftStart.getTime() + 5 * 60 * 1000);
        status = new Date(clockIn.timestamp) <= graceEnd ? 'ON_TIME' : 'LATE';
      } else if (now >= shiftStart) {
        status = 'MISSING';
      } else {
        status = 'NOT_STARTED';
      }

      return {
        shiftId: shift.id,
        employee: shift.employee,
        role: shift.role,
        location: shift.location,
        shiftStart: shift.startTime,
        shiftEnd: shift.endTime,
        isAdHoc: shift.isAdHoc,
        clockIn: clockIn ? { id: clockIn.id, timestamp: clockIn.timestamp, method: clockIn.method } : null,
        clockOut: clockOut ? { id: clockOut.id, timestamp: clockOut.timestamp, method: clockOut.method } : null,
        status,
      };
    });

    // Compute summary counts
    const summary = {
      onTime: attendanceEntries.filter((e) => e.status === 'ON_TIME').length,
      late: attendanceEntries.filter((e) => e.status === 'LATE').length,
      missing: attendanceEntries.filter((e) => e.status === 'MISSING').length,
      clockedOut: attendanceEntries.filter((e) => e.status === 'CLOCKED_OUT').length,
      notStarted: attendanceEntries.filter((e) => e.status === 'NOT_STARTED').length,
      total: attendanceEntries.length,
    };

    return {
      date: todayStart.toISOString(),
      departmentId: scopeDepartmentId || null,
      summary,
      entries: attendanceEntries,
      timestamp: now.toISOString(),
    };
  }

  /**
   * AC5 (Story 6.3): Log GPS verification success/failure per location.
   * Alerts when success rate drops below 85% over 7 days.
   */
  private async logGpsVerification(
    tenantId: string,
    locationId: string,
    success: boolean,
    distance: number,
  ) {
    // Use audit log to track GPS results — lightweight, no new table
    this.auditLogService.create({
      tenantId,
      action: 'CREATE' as any,
      entityType: 'GpsVerification',
      entityId: locationId,
      newValues: { success, distance: Math.round(distance) },
    }).catch(() => {});

    if (!success) {
      // Check recent failure rate for this location
      const db = this.prisma.forTenant(tenantId);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const recentEvents = await db.clockEvent.findMany({
        where: {
          shift: { locationId },
          type: 'CLOCK_IN',
          timestamp: { gte: sevenDaysAgo },
        },
        select: { geofenceVerified: true },
      });

      // Also count recent failures (clock-in attempts that were rejected
      // won't appear in ClockEvent since they weren't created).
      // So we only track the success rate of created events here.
      // For a full picture, the audit log GpsVerification entries
      // can be queried by an admin dashboard.
      if (recentEvents.length >= 10) {
        const successCount = recentEvents.filter((e) => e.geofenceVerified).length;
        const rate = successCount / recentEvents.length;
        if (rate < 0.85) {
          console.warn(
            `[GPS_ALERT] Location ${locationId} (tenant ${tenantId}): GPS success rate ${(rate * 100).toFixed(0)}% over 7 days (${successCount}/${recentEvents.length}). Review geofence radius.`,
          );
        }
      }
    }
  }
}
