import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto, UpdateShiftDto, BulkCreateShiftsDto } from './dto';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, scheduleId: string, dto: CreateShiftDto) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await db.schedule.findFirst({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return db.shift.create({
      data: {
        tenantId,
        scheduleId,
        employeeId: dto.employeeId,
        roleId: dto.roleId,
        locationId: dto.locationId,
        date: new Date(dto.date),
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        notes: dto.notes,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        role: { select: { id: true, name: true, color: true, shortCode: true } },
        location: { select: { id: true, name: true } },
      },
    });
  }

  async createBulk(tenantId: string, scheduleId: string, dto: BulkCreateShiftsDto) {
    const db = this.prisma.forTenant(tenantId);
    const schedule = await db.schedule.findFirst({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const data = dto.shifts.map((shift) => ({
      tenantId,
      scheduleId,
      employeeId: shift.employeeId,
      roleId: shift.roleId,
      locationId: shift.locationId,
      date: new Date(shift.date),
      startTime: new Date(shift.startTime),
      endTime: new Date(shift.endTime),
      notes: shift.notes,
    }));

    await db.shift.createMany({ data });

    return db.shift.findMany({
      where: { scheduleId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        role: { select: { id: true, name: true, color: true, shortCode: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async update(tenantId: string, id: string, dto: UpdateShiftDto) {
    const db = this.prisma.forTenant(tenantId);
    const shift = await db.shift.findFirst({
      where: { id },
      include: { schedule: true },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return db.shift.update({
      where: { id },
      data: {
        employeeId: dto.employeeId,
        roleId: dto.roleId,
        locationId: dto.locationId,
        date: dto.date ? new Date(dto.date) : undefined,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        notes: dto.notes,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        role: { select: { id: true, name: true, color: true, shortCode: true } },
        location: { select: { id: true, name: true } },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const shift = await db.shift.findFirst({
      where: { id },
      include: { schedule: true },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    await db.shift.delete({ where: { id } });
    return { deleted: true };
  }
}
