import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateGroupDto, UpdateGroupDto } from './dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService, private auditLogService: AuditLogService) {}

  async create(tenantId: string, dto: CreateGroupDto) {
    const db = this.prisma.forTenant(tenantId);

    const existing = await db.group.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('A group with this name already exists');
    }

    const group = await db.group.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    this.auditLogService.create({
      tenantId, action: 'CREATE' as any, entityType: 'Group', entityId: group.id,
      newValues: { name: dto.name, description: dto.description },
    }).catch(() => {});

    return group;
  }

  async findAll(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.group.findMany({
      include: {
        _count: { select: { members: true } },
        members: {
          select: {
            employee: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const group = await db.group.findFirst({
      where: { id },
      include: {
        _count: { select: { members: true } },
        members: {
          select: {
            employee: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async update(tenantId: string, id: string, dto: UpdateGroupDto) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, id);

    if (dto.name) {
      const existing = await db.group.findFirst({
        where: { name: dto.name, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('A group with this name already exists');
      }
    }

    const group = await db.group.update({
      where: { id },
      data: dto,
      include: {
        _count: { select: { members: true } },
      },
    });

    this.auditLogService.create({
      tenantId, action: 'UPDATE' as any, entityType: 'Group', entityId: id,
      newValues: dto as any,
    }).catch(() => {});

    return group;
  }

  async remove(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, id);
    await db.group.delete({ where: { id } });

    this.auditLogService.create({
      tenantId, action: 'DELETE' as any, entityType: 'Group', entityId: id,
    }).catch(() => {});

    return { deleted: true };
  }

  async setMembers(tenantId: string, groupId: string, employeeIds: string[]) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, groupId);

    await db.$transaction([
      db.groupMember.deleteMany({ where: { groupId } }),
      ...employeeIds.map((employeeId) =>
        db.groupMember.create({
          data: { tenantId, groupId, employeeId },
        }),
      ),
    ]);

    this.auditLogService.create({
      tenantId, action: 'UPDATE' as any, entityType: 'Group', entityId: groupId,
      newValues: { memberIds: employeeIds },
    }).catch(() => {});

    return this.findOne(tenantId, groupId);
  }
}
