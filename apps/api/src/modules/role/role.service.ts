import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateRoleDto, UpdateRoleDto } from './dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService, private auditLogService: AuditLogService) {}

  private generateShortCode(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  }

  async create(tenantId: string, dto: CreateRoleDto) {
    const db = this.prisma.forTenant(tenantId);

    const existing = await db.role.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }

    let shortCode = dto.shortCode || this.generateShortCode(dto.name);

    const existingCode = await db.role.findFirst({
      where: { shortCode },
    });

    if (existingCode) {
      if (dto.shortCode) {
        throw new ConflictException('A role with this short code already exists');
      }
      shortCode = shortCode + Math.floor(Math.random() * 10);
    }

    const role = await db.role.create({
      data: {
        tenantId,
        name: dto.name,
        shortCode,
        description: dto.description,
        color: dto.color || '#6366f1',
        icon: dto.icon,
      },
    });

    this.auditLogService.create({
      tenantId, action: 'CREATE' as any, entityType: 'Role', entityId: role.id,
      newValues: { name: dto.name, shortCode, color: dto.color },
    }).catch(() => {});

    return role;
  }

  async findAll(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.role.findMany({
      include: {
        _count: { select: { employeeRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const role = await db.role.findFirst({
      where: { id },
      include: {
        _count: { select: { employeeRoles: true } },
        employeeRoles: {
          select: {
            employee: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(tenantId: string, id: string, dto: UpdateRoleDto) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, id);

    if (dto.name) {
      const existing = await db.role.findFirst({
        where: { name: dto.name, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('A role with this name already exists');
      }
    }

    if (dto.shortCode) {
      const existingCode = await db.role.findFirst({
        where: { shortCode: dto.shortCode, id: { not: id } },
      });

      if (existingCode) {
        throw new ConflictException('A role with this short code already exists');
      }
    }

    const role = await db.role.update({
      where: { id },
      data: dto,
    });

    this.auditLogService.create({
      tenantId, action: 'UPDATE' as any, entityType: 'Role', entityId: id,
      newValues: dto as any,
    }).catch(() => {});

    return role;
  }

  async remove(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const role = await this.findOne(tenantId, id);

    const employeeCount = (role as any)._count?.employeeRoles || 0;

    await db.role.delete({ where: { id } });

    this.auditLogService.create({
      tenantId, action: 'DELETE' as any, entityType: 'Role', entityId: id,
      oldValues: { name: (role as any).name },
    }).catch(() => {});

    return { deleted: true, affectedEmployees: employeeCount };
  }
}
