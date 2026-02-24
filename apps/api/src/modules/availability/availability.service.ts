import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetAvailabilityDto } from './dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getForEmployee(tenantId: string, employeeId: string) {
    const db = this.prisma.forTenant(tenantId);

    const employee = await db.employee.findFirst({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return db.availability.findMany({
      where: { employeeId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setForEmployee(tenantId: string, employeeId: string, dto: SetAvailabilityDto) {
    const db = this.prisma.forTenant(tenantId);

    const employee = await db.employee.findFirst({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return db.$transaction(async (tx) => {
      await tx.availability.deleteMany({
        where: { employeeId },
      });

      const entries = dto.entries.map((entry) => ({
        tenantId,
        employeeId,
        dayOfWeek: entry.dayOfWeek as any,
        isAvailable: entry.isAvailable,
        startTime: entry.startTime,
        endTime: entry.endTime,
      }));

      await tx.availability.createMany({ data: entries });

      return tx.availability.findMany({
        where: { employeeId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }

  async getBatch(tenantId: string, employeeIds?: string[]) {
    const db = this.prisma.forTenant(tenantId);
    const where: any = {};
    if (employeeIds?.length) {
      where.employeeId = { in: employeeIds };
    }

    return db.availability.findMany({
      where,
      orderBy: [{ employeeId: 'asc' }, { dayOfWeek: 'asc' }],
    });
  }
}
