import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../auth/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeListQueryDto } from './dto';
import { INVITE_TOKEN_EXPIRY_HOURS } from '@scheduler/shared-types';

@Injectable()
export class EmployeeService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private auditLogService: AuditLogService,
  ) {}

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const db = this.prisma.forTenant(tenantId);

    const existing = await db.employee.findFirst({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('An employee with this email already exists');
    }

    const inviteToken = uuidv4();
    const inviteExpiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    const employee = await db.employee.create({
      data: {
        tenantId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        systemRole: dto.systemRole || 'EMPLOYEE',
        employmentType: dto.employmentType || 'FULL_TIME',
        departmentId: dto.departmentId,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
        weeklyHoursCap: dto.weeklyHoursCap,
        inviteToken,
        inviteExpiresAt,
        status: 'INVITED',
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    // Generate preview token (AC1: 30-day expiry, UUID v4)
    const previewToken = uuidv4();
    const previewExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.previewToken.create({
      data: {
        tenantId,
        employeeId: employee.id,
        token: previewToken,
        expiresAt: previewExpiresAt,
      },
    });

    this.mailService.sendInviteEmail(employee.email, employee.firstName, inviteToken, previewToken).catch(console.error);

    this.auditLogService.create({
      tenantId, action: 'CREATE' as any, entityType: 'Employee', entityId: employee.id,
      newValues: { email: dto.email, firstName: dto.firstName, lastName: dto.lastName, systemRole: dto.systemRole || 'EMPLOYEE' },
    }).catch(() => {});

    return employee;
  }

  async findAll(tenantId: string, query: EmployeeListQueryDto, currentUser?: { systemRole: string; departmentId?: string }) {
    const db = this.prisma.forTenant(tenantId);
    const { page = 1, pageSize = 20, search, departmentId, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: Record<string, unknown> = {};

    if (currentUser?.systemRole === 'MANAGER' && currentUser.departmentId) {
      where.departmentId = currentUser.departmentId;
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      db.employee.findMany({
        where: where as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          systemRole: true,
          employmentType: true,
          status: true,
          hireDate: true,
          weeklyHoursCap: true,
          department: { select: { id: true, name: true } },
          employeeRoles: {
            select: { role: { select: { id: true, name: true, shortCode: true, color: true } } },
          },
          createdAt: true,
        },
      }),
      db.employee.count({ where: where as any }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const employee = await db.employee.findFirst({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        systemRole: true,
        employmentType: true,
        status: true,
        hireDate: true,
        weeklyHoursCap: true,
        lastLoginAt: true,
        department: { select: { id: true, name: true } },
        employeeRoles: {
          select: { role: { select: { id: true, name: true, shortCode: true, color: true, icon: true } } },
        },
        groupMembers: {
          select: { group: { select: { id: true, name: true } } },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    const db = this.prisma.forTenant(tenantId);
    const before = await this.findOne(tenantId, id);

    const employee = await db.employee.update({
      where: { id },
      data: {
        ...dto,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    this.auditLogService.create({
      tenantId, action: 'UPDATE' as any, entityType: 'Employee', entityId: id,
      oldValues: before as any, newValues: dto as any,
    }).catch(() => {});

    return employee;
  }

  async archive(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const employee = await this.findOne(tenantId, id);

    if ((employee as any).status === 'ARCHIVED') {
      throw new BadRequestException('Employee is already archived');
    }

    // Protect last SUPER_ADMIN
    if ((employee as any).systemRole === 'SUPER_ADMIN') {
      const superAdminCount = await db.employee.count({
        where: { systemRole: 'SUPER_ADMIN', status: { not: 'ARCHIVED' } },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException('Cannot archive the last Super Admin');
      }
    }

    // Revoke all sessions on archive
    await db.session.deleteMany({ where: { employeeId: id } });

    const result = await db.employee.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    this.auditLogService.create({
      tenantId, action: 'ARCHIVE' as any, entityType: 'Employee', entityId: id,
      oldValues: { status: (employee as any).status }, newValues: { status: 'ARCHIVED' },
    }).catch(() => {});

    return result;
  }

  async reactivate(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const employee = await this.findOne(tenantId, id);

    if ((employee as any).status !== 'ARCHIVED') {
      throw new BadRequestException('Employee is not archived');
    }

    const result = await db.employee.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    this.auditLogService.create({
      tenantId, action: 'REACTIVATE' as any, entityType: 'Employee', entityId: id,
      oldValues: { status: 'ARCHIVED' }, newValues: { status: 'ACTIVE' },
    }).catch(() => {});

    return result;
  }

  async getSessions(tenantId: string, employeeId: string) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, employeeId);

    return db.session.findMany({
      where: { employeeId, revokedAt: null },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(tenantId: string, employeeId: string, sessionId: string) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, employeeId);

    const session = await db.session.findFirst({
      where: { id: sessionId, employeeId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await db.session.delete({ where: { id: sessionId } });
    return { revoked: true };
  }

  async revokeAllSessions(tenantId: string, employeeId: string) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, employeeId);

    const result = await db.session.deleteMany({
      where: { employeeId },
    });

    return { revoked: true, count: result.count };
  }

  async assignRoles(tenantId: string, employeeId: string, roleIds: string[]) {
    const db = this.prisma.forTenant(tenantId);
    await this.findOne(tenantId, employeeId);

    await db.$transaction([
      db.employeeRole.deleteMany({ where: { employeeId } }),
      ...roleIds.map((roleId) =>
        db.employeeRole.create({
          data: { tenantId, employeeId, roleId },
        }),
      ),
    ]);

    return this.findOne(tenantId, employeeId);
  }

  async resendInvite(tenantId: string, id: string) {
    const db = this.prisma.forTenant(tenantId);
    const employee = await this.findOne(tenantId, id);

    if ((employee as any).status !== 'INVITED') {
      throw new BadRequestException('Employee is not in INVITED status');
    }

    const inviteToken = uuidv4();
    const inviteExpiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await db.employee.update({
      where: { id },
      data: { inviteToken, inviteExpiresAt },
    });

    // Regenerate preview token on resend
    const previewToken = uuidv4();
    const previewExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.previewToken.create({
      data: {
        tenantId,
        employeeId: id,
        token: previewToken,
        expiresAt: previewExpiresAt,
      },
    });

    this.mailService.sendInviteEmail((employee as any).email, (employee as any).firstName, inviteToken, previewToken).catch(console.error);

    this.auditLogService.create({
      tenantId, action: 'INVITE_SENT' as any, entityType: 'Employee', entityId: id,
      newValues: { email: (employee as any).email },
    }).catch(() => {});

    return { sent: true };
  }
}
