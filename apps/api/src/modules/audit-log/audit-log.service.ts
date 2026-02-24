import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateAuditLogInput {
  tenantId: string;
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateAuditLogInput) {
    const db = this.prisma.forTenant(input.tenantId);
    return db.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValues: input.oldValues as any,
        newValues: input.newValues as any,
        ipAddress: input.ipAddress,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters: {
      entityType?: string;
      actorId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const db = this.prisma.forTenant(tenantId);
    const { entityType, actorId, action, startDate, endDate, page = 1, pageSize = 50 } = filters;

    const where: Record<string, unknown> = {};

    if (entityType) where.entityType = entityType;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where: where as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      db.auditLog.count({ where: where as any }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
