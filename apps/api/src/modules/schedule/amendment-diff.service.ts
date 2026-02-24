import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AmendmentPreview,
  EmployeeAmendmentDiff,
  ShiftChange,
  ShiftFieldChange,
} from '@scheduler/shared-types';

interface SnapshotShift {
  id: string;
  employeeId: string;
  roleId: string;
  locationId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  roleName: string | null;
  locationName: string | null;
}

@Injectable()
export class AmendmentDiffService {
  constructor(private prisma: PrismaService) {}

  /**
   * Compute per-employee diffs between the published snapshot and current DB state.
   * AC6: Independent of Zustand undo/redo, computed on-demand at preview time.
   */
  async computeDiff(tenantId: string, scheduleId: string): Promise<AmendmentPreview> {
    const db = this.prisma.forTenant(tenantId);

    const schedule = await db.schedule.findFirst({
      where: { id: scheduleId },
      include: {
        shifts: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
            role: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.status !== 'PUBLISHED') {
      throw new BadRequestException('Schedule is not published — no snapshot to compare against');
    }

    if (!schedule.publishedShiftsSnapshot) {
      throw new BadRequestException('No published snapshot available. Republish the schedule first.');
    }

    const snapshotShifts = schedule.publishedShiftsSnapshot as unknown as SnapshotShift[];
    const currentShifts = schedule.shifts;

    // Build lookup maps
    const snapshotById = new Map<string, SnapshotShift>();
    for (const s of snapshotShifts) {
      snapshotById.set(s.id, s);
    }

    const currentById = new Map<string, typeof currentShifts[0]>();
    for (const s of currentShifts) {
      currentById.set(s.id, s);
    }

    // Collect all affected employee IDs and their names
    const employeeNames = new Map<string, string>();
    for (const s of currentShifts) {
      if (s.employee) {
        employeeNames.set(s.employeeId, `${s.employee.firstName} ${s.employee.lastName}`);
      }
    }
    for (const s of snapshotShifts) {
      if (!employeeNames.has(s.employeeId)) {
        // Employee was in snapshot but might not be in current shifts — look up
        employeeNames.set(s.employeeId, s.employeeId); // fallback, will try to resolve below
      }
    }

    // Per-employee change accumulator
    const changesByEmployee = new Map<string, ShiftChange[]>();

    const addChange = (employeeId: string, change: ShiftChange) => {
      const existing = changesByEmployee.get(employeeId) || [];
      existing.push(change);
      changesByEmployee.set(employeeId, existing);
    };

    // Detect REMOVED and MODIFIED shifts
    for (const [shiftId, snapshot] of snapshotById) {
      const current = currentById.get(shiftId);

      if (!current) {
        // Shift was removed
        addChange(snapshot.employeeId, {
          type: 'REMOVED',
          shiftId,
          date: snapshot.date.split('T')[0],
          startTime: this.formatTime(snapshot.startTime),
          endTime: this.formatTime(snapshot.endTime),
          roleName: snapshot.roleName || undefined,
          locationName: snapshot.locationName || undefined,
        });
        continue;
      }

      // Check for modifications
      const fieldChanges = this.compareShift(snapshot, current);

      if (fieldChanges.length > 0) {
        // If employee changed, this is a REMOVED for old employee + ADDED for new
        if (snapshot.employeeId !== current.employeeId) {
          addChange(snapshot.employeeId, {
            type: 'REMOVED',
            shiftId,
            date: snapshot.date.split('T')[0],
            startTime: this.formatTime(snapshot.startTime),
            endTime: this.formatTime(snapshot.endTime),
            roleName: snapshot.roleName || undefined,
            locationName: snapshot.locationName || undefined,
            fieldChanges: [{ field: 'Employee', oldValue: 'This employee', newValue: 'Reassigned' }],
          });
          addChange(current.employeeId, {
            type: 'ADDED',
            shiftId,
            date: new Date(current.date).toISOString().split('T')[0],
            startTime: this.formatTime(new Date(current.startTime).toISOString()),
            endTime: this.formatTime(new Date(current.endTime).toISOString()),
            roleName: current.role?.name || undefined,
            locationName: current.location?.name || undefined,
          });
          if (current.employee) {
            employeeNames.set(current.employeeId, `${current.employee.firstName} ${current.employee.lastName}`);
          }
        } else {
          addChange(snapshot.employeeId, {
            type: 'MODIFIED',
            shiftId,
            date: new Date(current.date).toISOString().split('T')[0],
            startTime: this.formatTime(new Date(current.startTime).toISOString()),
            endTime: this.formatTime(new Date(current.endTime).toISOString()),
            roleName: current.role?.name || undefined,
            locationName: current.location?.name || undefined,
            fieldChanges,
          });
        }
      }
    }

    // Detect ADDED shifts (in current but not in snapshot)
    for (const [shiftId, current] of currentById) {
      if (!snapshotById.has(shiftId)) {
        addChange(current.employeeId, {
          type: 'ADDED',
          shiftId,
          date: new Date(current.date).toISOString().split('T')[0],
          startTime: this.formatTime(new Date(current.startTime).toISOString()),
          endTime: this.formatTime(new Date(current.endTime).toISOString()),
          roleName: current.role?.name || undefined,
          locationName: current.location?.name || undefined,
        });
        if (current.employee) {
          employeeNames.set(current.employeeId, `${current.employee.firstName} ${current.employee.lastName}`);
        }
      }
    }

    // Resolve any employee names that are still just IDs
    const unresolvedIds = [...employeeNames.entries()]
      .filter(([id, name]) => id === name)
      .map(([id]) => id);

    if (unresolvedIds.length > 0) {
      const employees = await db.employee.findMany({
        where: { id: { in: unresolvedIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      for (const emp of employees) {
        employeeNames.set(emp.id, `${emp.firstName} ${emp.lastName}`);
      }
    }

    // Build per-employee diff array (AC3: exclude employees with no changes)
    const employeeDiffs: EmployeeAmendmentDiff[] = [];
    let totalChanges = 0;

    for (const [employeeId, changes] of changesByEmployee) {
      if (changes.length === 0) continue;
      totalChanges += changes.length;
      employeeDiffs.push({
        employeeId,
        employeeName: employeeNames.get(employeeId) || 'Unknown',
        changes: changes.sort((a, b) => a.date.localeCompare(b.date)),
      });
    }

    // Sort by employee name
    employeeDiffs.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    return {
      scheduleId,
      scheduleName: schedule.name,
      hasChanges: totalChanges > 0,
      affectedEmployeeCount: employeeDiffs.length,
      totalChanges,
      employeeDiffs,
    };
  }

  /**
   * Compare a snapshot shift against the current DB shift and return field-level changes.
   * AC5: Includes specific field changes (role, time, location).
   */
  private compareShift(snapshot: SnapshotShift, current: any): ShiftFieldChange[] {
    const changes: ShiftFieldChange[] = [];

    // Date
    const snapDate = snapshot.date.split('T')[0];
    const curDate = new Date(current.date).toISOString().split('T')[0];
    if (snapDate !== curDate) {
      changes.push({
        field: 'Date',
        oldValue: this.formatDate(snapshot.date),
        newValue: this.formatDate(new Date(current.date).toISOString()),
      });
    }

    // Start time
    const snapStart = this.formatTime(snapshot.startTime);
    const curStart = this.formatTime(new Date(current.startTime).toISOString());
    if (snapStart !== curStart) {
      changes.push({
        field: 'Start time',
        oldValue: snapStart,
        newValue: curStart,
      });
    }

    // End time
    const snapEnd = this.formatTime(snapshot.endTime);
    const curEnd = this.formatTime(new Date(current.endTime).toISOString());
    if (snapEnd !== curEnd) {
      changes.push({
        field: 'End time',
        oldValue: snapEnd,
        newValue: curEnd,
      });
    }

    // Role
    if (snapshot.roleId !== current.roleId) {
      changes.push({
        field: 'Role',
        oldValue: snapshot.roleName || snapshot.roleId,
        newValue: current.role?.name || current.roleId,
      });
    }

    // Location
    const snapLocId = snapshot.locationId || '';
    const curLocId = current.locationId || '';
    if (snapLocId !== curLocId) {
      changes.push({
        field: 'Location',
        oldValue: snapshot.locationName || 'None',
        newValue: current.location?.name || 'None',
      });
    }

    // Employee reassignment
    if (snapshot.employeeId !== current.employeeId) {
      changes.push({
        field: 'Employee',
        oldValue: snapshot.employeeId,
        newValue: current.employeeId,
      });
    }

    return changes;
  }

  private formatTime(isoString: string): string {
    const d = new Date(isoString);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }

  private formatDate(isoString: string): string {
    return isoString.split('T')[0];
  }
}
