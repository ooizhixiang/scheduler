import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftConflict } from '@scheduler/shared-types';

@Injectable()
export class ConflictService {
  constructor(private prisma: PrismaService) {}

  async checkConflicts(tenantId: string, scheduleId: string): Promise<ShiftConflict[]> {
    const db = this.prisma.forTenant(tenantId);
    const conflicts: ShiftConflict[] = [];

    const shifts = await db.shift.findMany({
      where: { scheduleId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, weeklyHoursCap: true } },
      },
      orderBy: [{ employeeId: 'asc' }, { date: 'asc' }, { startTime: 'asc' }],
    });

    const shiftsByEmployee = new Map<string, typeof shifts>();
    for (const shift of shifts) {
      const existing = shiftsByEmployee.get(shift.employeeId) || [];
      existing.push(shift);
      shiftsByEmployee.set(shift.employeeId, existing);
    }

    for (const [employeeId, employeeShifts] of shiftsByEmployee) {
      for (let i = 0; i < employeeShifts.length; i++) {
        for (let j = i + 1; j < employeeShifts.length; j++) {
          const a = employeeShifts[i];
          const b = employeeShifts[j];

          if (a.startTime < b.endTime && b.startTime < a.endTime) {
            conflicts.push({
              type: 'OVERLAP',
              shiftId: b.id,
              employeeId,
              message: `${a.employee.firstName} ${a.employee.lastName} has overlapping shifts`,
              conflictingShiftId: a.id,
            });
          }
        }
      }

      const employee = employeeShifts[0]?.employee;
      if (employee?.weeklyHoursCap) {
        const totalHours = employeeShifts.reduce((sum: number, s: typeof employeeShifts[0]) => {
          const hours = (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);

        if (totalHours > employee.weeklyHoursCap) {
          conflicts.push({
            type: 'HOURS_CAP',
            shiftId: employeeShifts[employeeShifts.length - 1].id,
            employeeId,
            message: `${employee.firstName} ${employee.lastName} exceeds weekly hours cap (${totalHours.toFixed(1)}h / ${employee.weeklyHoursCap}h)`,
          });
        }
      }
    }

    const availability = await db.availability.findMany({
      where: {
        employeeId: { in: [...shiftsByEmployee.keys()] },
      },
    });

    const availMap = new Map<string, Set<string>>();
    for (const a of availability) {
      if (!a.isAvailable) {
        const existing = availMap.get(a.employeeId) || new Set();
        existing.add(a.dayOfWeek);
        availMap.set(a.employeeId, existing);
      }
    }

    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    for (const shift of shifts) {
      const unavailableDays = availMap.get(shift.employeeId);
      if (unavailableDays) {
        const shiftDay = dayNames[shift.date.getDay()];
        if (unavailableDays.has(shiftDay)) {
          conflicts.push({
            type: 'AVAILABILITY',
            shiftId: shift.id,
            employeeId: shift.employeeId,
            message: `${shift.employee.firstName} ${shift.employee.lastName} is unavailable on ${shiftDay.toLowerCase()}`,
          });
        }
      }
    }

    return conflicts;
  }
}
