import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService, private auditLogService: AuditLogService) {}

  /**
   * If the assigned manager is an EMPLOYEE, auto-promote to MANAGER.
   */
  private async ensureManagerRole(db: ReturnType<PrismaService['forTenant']>, managerId: string) {
    const employee = await db.employee.findFirst({ where: { id: managerId } });
    if (!employee) {
      throw new BadRequestException('Manager employee not found');
    }
    if (employee.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot assign an archived employee as manager');
    }
    if (employee.systemRole === 'EMPLOYEE') {
      await db.employee.update({
        where: { id: managerId },
        data: { systemRole: 'MANAGER' },
      });
    }
  }

  async create(tenantId: string, dto: CreateDepartmentDto) {
    const db = this.prisma.forTenant(tenantId);

    const existing = await db.department.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('A department with this name already exists');
    }

    if (dto.managerId) {
      await this.ensureManagerRole(db, dto.managerId);
    }

    const department = await db.department.create({
      data: {
        tenantId,
        name: dto.name,
        managerId: dto.managerId,
      },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { employees: true } },
      },
    });

    this.auditLogService.create({
      tenantId, action: 'CREATE' as any, entityType: 'Department', entityId: department.id,
      newValues: { name: dto.name, managerId: dto.managerId },
    }).catch(() => {});

    return department;
  }

  async findAll(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.department.findMany({
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const department = await db.department.findFirst({
      where: { id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        employees: {
          select: { id: true, firstName: true, lastName: true, email: true, systemRole: true, status: true },
        },
        _count: { select: { employees: true } },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, id);

    if (dto.name) {
      const existing = await db.department.findFirst({
        where: { name: dto.name, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('A department with this name already exists');
      }
    }

    if (dto.managerId) {
      await this.ensureManagerRole(db, dto.managerId);
    }

    const department = await db.department.update({
      where: { id },
      data: {
        name: dto.name,
        managerId: dto.managerId === null ? null : dto.managerId,
      },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { employees: true } },
      },
    });

    this.auditLogService.create({
      tenantId, action: 'UPDATE' as any, entityType: 'Department', entityId: id,
      newValues: dto as any,
    }).catch(() => {});

    return department;
  }

  async remove(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, id);

    await db.employee.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });

    await db.department.delete({ where: { id } });

    this.auditLogService.create({
      tenantId, action: 'DELETE' as any, entityType: 'Department', entityId: id,
    }).catch(() => {});

    return { deleted: true };
  }
}
