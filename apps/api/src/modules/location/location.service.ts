import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService, private auditLogService: AuditLogService) {}

  async create(tenantId: string, dto: CreateLocationDto) {
    const db = this.prisma.forTenant(tenantId);

    const existing = await db.location.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('A location with this name already exists');
    }

    const location = await db.location.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        geofenceRadius: dto.geofenceRadius,
        status: (dto.status as any) || 'ACTIVE',
      },
    });

    this.auditLogService.create({
      tenantId, action: 'CREATE' as any, entityType: 'Location', entityId: location.id,
      newValues: { name: dto.name, address: dto.address },
    }).catch(() => {});

    return location;
  }

  async findAll(tenantId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.location.findMany({
      include: {
        _count: { select: { shifts: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const location = await db.location.findFirst({
      where: { id },
      include: {
        _count: { select: { shifts: true } },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async update(tenantId: string, id: string, dto: UpdateLocationDto) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, id);

    if (dto.name) {
      const existing = await db.location.findFirst({
        where: { name: dto.name, id: { not: id } },
      });

      if (existing) {
        throw new ConflictException('A location with this name already exists');
      }
    }

    const location = await db.location.update({
      where: { id },
      data: dto as any,
    });

    this.auditLogService.create({
      tenantId, action: 'UPDATE' as any, entityType: 'Location', entityId: id,
      newValues: dto as any,
    }).catch(() => {});

    return location;
  }

  async remove(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const location = await this.findOne(tenantId, id);
    const shiftCount = (location as any)._count?.shifts || 0;

    await db.location.delete({ where: { id } });

    this.auditLogService.create({
      tenantId, action: 'DELETE' as any, entityType: 'Location', entityId: id,
      oldValues: { name: (location as any).name },
    }).catch(() => {});

    return { deleted: true, affectedShifts: shiftCount };
  }
}
