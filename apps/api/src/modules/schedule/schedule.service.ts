import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateScheduleDto, UpdateScheduleDto, CopyScheduleDto } from './dto';
import { AmendmentDiffService } from './amendment-diff.service';

@Injectable()
export class ScheduleService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private auditLogService: AuditLogService,
    private amendmentDiffService: AmendmentDiffService,
  ) {}

  async create(tenantId: string, createdById: string, dto: CreateScheduleDto) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await db.schedule.create({
      data: {
        tenantId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdById,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { shifts: true } },
      },
    });

    this.auditLogService.create({
      tenantId, action: 'CREATE' as any, entityType: 'Schedule', entityId: schedule.id,
      actorId: createdById,
      newValues: { name: dto.name, startDate: dto.startDate, endDate: dto.endDate },
    }).catch(() => {});

    return schedule;
  }

  async findAll(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.schedule.findMany({
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        publishedBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { shifts: true, views: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await db.schedule.findFirst({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        publishedBy: { select: { id: true, firstName: true, lastName: true } },
        shifts: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, email: true } },
            role: { select: { id: true, name: true, color: true, shortCode: true } },
            location: { select: { id: true, name: true } },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
        _count: { select: { shifts: true, views: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async update(tenantId: string, id: string, dto: UpdateScheduleDto) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await this.findOne(tenantId, id);

    const updated = await db.schedule.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });

    this.auditLogService.create({
      tenantId, action: 'UPDATE' as any, entityType: 'Schedule', entityId: id,
      oldValues: { name: schedule.name },
      newValues: dto as any,
    }).catch(() => {});

    return updated;
  }

  async remove(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await this.findOne(tenantId, id);
    await db.schedule.delete({ where: { id } });

    this.auditLogService.create({
      tenantId, action: 'DELETE' as any, entityType: 'Schedule', entityId: id,
      oldValues: { name: schedule.name },
    }).catch(() => {});

    return { deleted: true };
  }

  async publish(tenantId: string, id: string, publishedById: string) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await this.findOne(tenantId, id);

    if (schedule.status === 'PUBLISHED') {
      throw new BadRequestException('Schedule is already published');
    }

    // Snapshot break deduction rules from company settings (AR23)
    let breakRulesSnapshot: any = null;
    try {
      const settings = await db.companySettings.findFirst();
      if (settings?.breakRules) {
        breakRulesSnapshot = settings.breakRules;
      }
    } catch {
      // Continue without snapshot if settings unavailable
    }

    // Snapshot current shifts for amendment diff comparison
    const shiftsSnapshot = schedule.shifts.map((s: any) => ({
      id: s.id,
      employeeId: s.employeeId,
      roleId: s.roleId,
      locationId: s.locationId,
      date: new Date(s.date).toISOString(),
      startTime: new Date(s.startTime).toISOString(),
      endTime: new Date(s.endTime).toISOString(),
      notes: s.notes || null,
      roleName: s.role?.name || null,
      locationName: s.location?.name || null,
    }));

    const updated = await db.schedule.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById,
        breakRulesSnapshot,
        publishedShiftsSnapshot: shiftsSnapshot,
      },
    });

    this.auditLogService.create({
      tenantId, action: 'PUBLISH' as any, entityType: 'Schedule', entityId: id,
      actorId: publishedById,
      newValues: { status: 'PUBLISHED' },
    }).catch(() => {});

    // Format dates for email templates
    const startDateStr = new Date(schedule.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const endDateStr = new Date(schedule.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    const publishedEmployeeIds: string[] = [...new Set(schedule.shifts.map((s: any) => s.employeeId))];
    for (const employeeId of publishedEmployeeIds) {
      this.notificationService.createNotification({
        tenantId,
        recipientId: employeeId,
        type: 'SCHEDULE_PUBLISHED' as any,
        title: 'New schedule published',
        body: `Schedule "${schedule.name}" has been published. Check your shifts.`,
        link: '/my-schedule',
        templateData: {
          scheduleName: schedule.name,
          startDate: startDateStr,
          endDate: endDateStr,
        },
      }).catch(() => {});
    }

    return updated;
  }

  async unpublish(tenantId: string, id: string, actorId?: string) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await this.findOne(tenantId, id);

    if (schedule.status !== 'PUBLISHED') {
      throw new BadRequestException('Schedule is not published');
    }

    if (new Date(schedule.startDate) < new Date()) {
      throw new BadRequestException('Cannot unpublish a schedule that has already started');
    }

    const updated = await db.schedule.update({
      where: { id },
      data: {
        status: 'DRAFT',
        publishedAt: null,
        publishedById: null,
        breakRulesSnapshot: Prisma.DbNull,
        publishedShiftsSnapshot: Prisma.DbNull,
      },
    });

    this.auditLogService.create({
      tenantId, action: 'UNPUBLISH' as any, entityType: 'Schedule', entityId: id,
      actorId,
      newValues: { status: 'DRAFT' },
    }).catch(() => {});

    // Format dates for email templates
    const startDateStr = new Date(schedule.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const endDateStr = new Date(schedule.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    const unpublishedEmployeeIds: string[] = [...new Set(schedule.shifts.map((s: any) => s.employeeId))];
    for (const employeeId of unpublishedEmployeeIds) {
      this.notificationService.createNotification({
        tenantId,
        recipientId: employeeId,
        type: 'SCHEDULE_UNPUBLISHED' as any,
        title: 'Schedule unpublished',
        body: `Schedule "${schedule.name}" has been unpublished.`,
        link: '/my-schedule',
        templateData: {
          scheduleName: schedule.name,
          startDate: startDateStr,
          endDate: endDateStr,
        },
      }).catch(() => {});
    }

    return updated;
  }

  async copy(tenantId: string, sourceId: string, createdById: string, dto: CopyScheduleDto) {
    const db = this.prisma.forTenant(tenantId);
    const source = await this.findOne(tenantId, sourceId);

    const dayOffset = (new Date(dto.startDate).getTime() - new Date(source.startDate).getTime()) / (1000 * 60 * 60 * 24);

    const newSchedule = await db.schedule.create({
      data: {
        tenantId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdById,
      },
    });

    const shiftsToCreate = source.shifts
      .map((shift: any) => {
        const shiftDate = new Date(shift.date);
        shiftDate.setDate(shiftDate.getDate() + dayOffset);

        const startTime = new Date(shift.startTime);
        startTime.setDate(startTime.getDate() + dayOffset);

        const endTime = new Date(shift.endTime);
        endTime.setDate(endTime.getDate() + dayOffset);

        if (shiftDate >= new Date(dto.startDate) && shiftDate <= new Date(dto.endDate)) {
          return {
            tenantId,
            scheduleId: newSchedule.id,
            employeeId: shift.employeeId,
            roleId: shift.roleId,
            locationId: shift.locationId,
            date: shiftDate,
            startTime,
            endTime,
            notes: shift.notes,
          };
        }
        return null;
      })
      .filter(Boolean) as any[];

    if (shiftsToCreate.length) {
      await db.shift.createMany({ data: shiftsToCreate });
    }

    return this.findOne(tenantId, newSchedule.id);
  }

  async publishAmendments(tenantId: string, id: string, publishedById: string) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await this.findOne(tenantId, id);

    if (schedule.status !== 'PUBLISHED') {
      throw new BadRequestException('Schedule is not published. Use publish instead.');
    }

    // Compute the diff before updating the snapshot
    const diff = await this.amendmentDiffService.computeDiff(tenantId, id);

    if (!diff.hasChanges) {
      throw new BadRequestException('No changes to publish.');
    }

    // Update the snapshot to current state
    const currentShiftsSnapshot = schedule.shifts.map((s: any) => ({
      id: s.id,
      employeeId: s.employeeId,
      roleId: s.roleId,
      locationId: s.locationId,
      date: new Date(s.date).toISOString(),
      startTime: new Date(s.startTime).toISOString(),
      endTime: new Date(s.endTime).toISOString(),
      notes: s.notes || null,
      roleName: s.role?.name || null,
      locationName: s.location?.name || null,
    }));

    await db.schedule.update({
      where: { id },
      data: {
        publishedShiftsSnapshot: currentShiftsSnapshot,
        publishedAt: new Date(),
        publishedById,
      },
    });

    this.auditLogService.create({
      tenantId, action: 'PUBLISH' as any, entityType: 'Schedule', entityId: id,
      actorId: publishedById,
      newValues: { status: 'PUBLISHED', amendment: true, changesCount: diff.totalChanges },
    }).catch(() => {});

    // Format dates for templates
    const startDateStr = new Date(schedule.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const endDateStr = new Date(schedule.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    // AC4/FR50: Manager notification first
    this.notificationService.createNotification({
      tenantId,
      recipientId: publishedById,
      type: 'SCHEDULE_AMENDED' as any,
      title: 'Schedule amendments published',
      body: `You published ${diff.totalChanges} change${diff.totalChanges > 1 ? 's' : ''} to "${schedule.name}" affecting ${diff.affectedEmployeeCount} employee${diff.affectedEmployeeCount > 1 ? 's' : ''}.`,
      link: `/schedules/${id}`,
      templateData: {
        scheduleName: schedule.name,
        startDate: startDateStr,
        endDate: endDateStr,
      },
    }).catch(() => {});

    // AC4/FR50: Then notify each affected employee with their specific diff
    for (const empDiff of diff.employeeDiffs) {
      // Skip the publisher themselves
      if (empDiff.employeeId === publishedById) continue;

      const changeSummaries = empDiff.changes.map((c) => {
        const dateStr = new Date(c.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        if (c.type === 'ADDED') return `${dateStr}: New shift added (${c.startTime}–${c.endTime})`;
        if (c.type === 'REMOVED') return `${dateStr}: Shift removed (${c.startTime}–${c.endTime})`;
        if (c.type === 'MODIFIED' && c.fieldChanges) {
          const details = c.fieldChanges.map((f) => `${f.field}: ${f.oldValue} → ${f.newValue}`).join(', ');
          return `${dateStr}: ${details}`;
        }
        return `${dateStr}: Shift updated`;
      });

      const body = `Schedule "${schedule.name}" has been updated. Your changes:\n${changeSummaries.join('\n')}`;

      this.notificationService.createNotification({
        tenantId,
        recipientId: empDiff.employeeId,
        type: 'SCHEDULE_AMENDED' as any,
        title: 'Schedule updated',
        body,
        link: '/my-schedule',
        templateData: {
          scheduleName: schedule.name,
          startDate: startDateStr,
          endDate: endDateStr,
          changes: changeSummaries,
        },
      }).catch(() => {});
    }

    // Reset view tracking — employees need to re-view after amendments
    await db.scheduleView.deleteMany({ where: { scheduleId: id } });

    return diff;
  }

  async getMySchedule(tenantId: string, employeeId: string) {
    const db = this.prisma.forTenant(tenantId);
    const now = new Date();
    const schedules = await db.schedule.findMany({
      where: {
        status: 'PUBLISHED',
        endDate: { gte: now },
        shifts: { some: { employeeId } },
      },
      include: {
        shifts: {
          where: { employeeId },
          include: {
            role: { select: { id: true, name: true, color: true, shortCode: true } },
            location: { select: { id: true, name: true } },
            clockEvents: {
              select: { id: true, type: true, timestamp: true, geofenceVerified: true },
              orderBy: { timestamp: 'asc' },
            },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const scheduleIds = schedules.map((s) => s.id);
    if (scheduleIds.length === 0) return schedules;

    // Fetch co-worker shifts (other employees on same schedules)
    const coworkerShifts = await db.shift.findMany({
      where: {
        scheduleId: { in: scheduleIds },
        employeeId: { not: employeeId },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Index by schedule+date for fast lookup
    const coworkerMap = new Map<string, typeof coworkerShifts>();
    for (const s of coworkerShifts) {
      const dateKey = new Date(s.date).toISOString().split('T')[0];
      const key = `${s.scheduleId}:${dateKey}`;
      const arr = coworkerMap.get(key) || [];
      arr.push(s);
      coworkerMap.set(key, arr);
    }

    // Attach overlapping co-workers to each of the employee's shifts
    const result: any[] = schedules.map((schedule) => ({
      ...schedule,
      shifts: schedule.shifts.map((shift: any) => {
        const dateKey = new Date(shift.date).toISOString().split('T')[0];
        const key = `${schedule.id}:${dateKey}`;
        const sameDayShifts = coworkerMap.get(key) || [];

        const shiftStart = new Date(shift.startTime).getTime();
        const shiftEnd = new Date(shift.endTime).getTime();

        const seen = new Set<string>();
        const coworkers: { id: string; firstName: string; lastName: string }[] = [];
        for (const s of sameDayShifts) {
          if (seen.has(s.employee.id)) continue;
          const sStart = new Date(s.startTime).getTime();
          const sEnd = new Date(s.endTime).getTime();
          if (sStart < shiftEnd && sEnd > shiftStart) {
            seen.add(s.employee.id);
            coworkers.push({
              id: s.employee.id,
              firstName: s.employee.firstName,
              lastName: s.employee.lastName,
            });
          }
        }

        return { ...shift, coworkers };
      }),
    }));

    // Story 6.5: Include ad-hoc shifts (no schedule) from last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const adHocShifts = await db.shift.findMany({
      where: {
        employeeId,
        isAdHoc: true,
        date: { gte: thirtyDaysAgo },
      },
      include: {
        role: { select: { id: true, name: true, color: true, shortCode: true } },
        location: { select: { id: true, name: true } },
        clockEvents: {
          select: { id: true, type: true, timestamp: true, geofenceVerified: true },
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    if (adHocShifts.length > 0) {
      result.push({
        id: 'adhoc',
        name: 'Ad Hoc Shifts',
        shifts: adHocShifts.map((s: any) => ({ ...s, isAdHoc: true, coworkers: [] })),
      } as any);
    }

    return result;
  }
}
