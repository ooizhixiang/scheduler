import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationService } from '../notification/notification.service';

// Pre-computed dummy hash for timing-safe login (prevents email enumeration)
const DUMMY_HASH = '$2b$12$LJ3m4ys3Lk0TdcFOi/RCtuEBiyVyRkSh.bPOmzRkKmc7flpJkf8Pu';

const REFRESH_GRACE_PERIOD_MS = 10_000; // 10 seconds
const MAX_SESSIONS_PER_USER = 3;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
    private auditLogService: AuditLogService,
    private notificationService: NotificationService,
  ) {}

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { email, status: { not: 'ARCHIVED' } },
    });

    if (!employee || !employee.passwordHash) {
      // Timing-safe: run bcrypt compare even for non-existent users
      await bcrypt.compare(password, DUMMY_HASH);
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(password, employee.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Enforce max sessions: delete oldest if at limit
    const activeSessions = await this.prisma.session.findMany({
      where: { employeeId: employee.id, revokedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
      const sessionsToDelete = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS_PER_USER + 1);
      await this.prisma.session.deleteMany({
        where: { id: { in: sessionsToDelete.map((s) => s.id) } },
      });
    }

    const { accessToken, refreshToken, sessionId } = await this.generateTokens(
      employee.id,
      employee.email,
      employee.systemRole,
      employee.tenantId,
    );

    // Store session with hashed refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + this.parseExpiry(this.config.get('JWT_REFRESH_EXPIRY', '7d')));

    await this.prisma.session.create({
      data: {
        id: sessionId,
        tenantId: employee.tenantId,
        employeeId: employee.id,
        refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { lastLoginAt: new Date() },
    });

    this.auditLogService.create({
      tenantId: employee.tenantId, actorId: employee.id, action: 'LOGIN' as any,
      entityType: 'Employee', entityId: employee.id, ipAddress,
    }).catch(() => {});

    return {
      accessToken,
      refreshToken,
      employee: {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        systemRole: employee.systemRole,
        tenantId: employee.tenantId,
      },
    };
  }

  async register(
    businessName: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Check if email already exists across all tenants
    const existing = await this.prisma.employee.findFirst({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const tenantId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    // Create tenant settings + owner in a transaction
    const employee = await this.prisma.$transaction(async (tx) => {
      await tx.companySettings.create({
        data: {
          tenantId,
          companyName: businessName,
        },
      });

      return tx.employee.create({
        data: {
          tenantId,
          email,
          passwordHash,
          firstName,
          lastName,
          systemRole: 'SUPER_ADMIN',
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          hireDate: new Date(),
        },
      });
    });

    // Generate tokens and create session
    const { accessToken, refreshToken, sessionId } = await this.generateTokens(
      employee.id,
      employee.email,
      employee.systemRole,
      employee.tenantId,
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + this.parseExpiry(this.config.get('JWT_REFRESH_EXPIRY', '7d')));

    await this.prisma.session.create({
      data: {
        id: sessionId,
        tenantId,
        employeeId: employee.id,
        refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      employee: {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        systemRole: employee.systemRole,
        tenantId: employee.tenantId,
      },
    };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    let payload: { sub: string; sessionId: string; tenantId: string; type?: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify the actual token hash
    const tokenValid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!tokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if session is revoked (reuse detection or grace period)
    if (session.revokedAt) {
      const timeSinceRevoked = Date.now() - session.revokedAt.getTime();

      if (timeSinceRevoked <= REFRESH_GRACE_PERIOD_MS) {
        // Grace period: concurrent tab refresh race condition
        // Find the current active session for this user and rotate it
        const activeSession = await this.prisma.session.findFirst({
          where: { employeeId: session.employeeId, revokedAt: null },
          orderBy: { createdAt: 'desc' },
        });

        if (activeSession) {
          return this.rotateSession(activeSession, payload.sub, ipAddress, userAgent);
        }
      }

      // Reuse detected: invalidate ALL sessions for this user
      await this.prisma.session.deleteMany({
        where: { employeeId: session.employeeId },
      });
      throw new UnauthorizedException('Session has been revoked');
    }

    // Check expiry
    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
    });

    if (!employee || employee.status === 'ARCHIVED') {
      throw new UnauthorizedException('Account unavailable');
    }

    return this.rotateSession(session, payload.sub, ipAddress, userAgent);
  }

  private async rotateSession(
    session: { id: string; employeeId: string },
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { id: true, email: true, systemRole: true, tenantId: true },
    });

    if (!employee) {
      throw new UnauthorizedException('Account unavailable');
    }

    // Revoke old session (soft delete for grace period)
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const { accessToken, refreshToken, sessionId } = await this.generateTokens(
      employee.id,
      employee.email,
      employee.systemRole,
      employee.tenantId,
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + this.parseExpiry(this.config.get('JWT_REFRESH_EXPIRY', '7d')));

    await this.prisma.session.create({
      data: {
        id: sessionId,
        tenantId: employee.tenantId,
        employeeId: employee.id,
        refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return { accessToken, refreshToken };
  }

  async logout(userId: string, refreshToken?: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: userId }, select: { tenantId: true } });

    if (refreshToken) {
      try {
        const payload = this.jwtService.verify(refreshToken);
        if (payload.sessionId) {
          await this.prisma.session.delete({
            where: { id: payload.sessionId },
          }).catch(() => {});
        }
      } catch {
        await this.prisma.session.deleteMany({
          where: { employeeId: userId },
        });
      }
    } else {
      await this.prisma.session.deleteMany({
        where: { employeeId: userId },
      });
    }

    if (employee) {
      this.auditLogService.create({
        tenantId: employee.tenantId, actorId: userId, action: 'LOGOUT' as any,
        entityType: 'Employee', entityId: userId,
      }).catch(() => {});
    }
  }

  async forgotPassword(email: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { email, status: { not: 'ARCHIVED' } },
    });

    if (!employee) return;

    const resetToken = uuidv4();
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { resetToken, resetExpiresAt },
    });

    await this.mailService.sendPasswordResetEmail(employee.email, employee.firstName, resetToken);
  }

  async resetPassword(token: string, password: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        resetToken: token,
        resetExpiresAt: { gt: new Date() },
      },
    });

    if (!employee) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Invalidate all sessions on password reset
    await this.prisma.session.deleteMany({
      where: { employeeId: employee.id },
    });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpiresAt: null,
      },
    });

    this.auditLogService.create({
      tenantId: employee.tenantId, actorId: employee.id, action: 'PASSWORD_RESET' as any,
      entityType: 'Employee', entityId: employee.id,
    }).catch(() => {});
  }

  async getInviteInfo(token: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { inviteToken: token, status: 'INVITED' },
      select: { email: true, firstName: true, lastName: true, inviteExpiresAt: true },
    });

    if (!employee) {
      throw new BadRequestException('Invalid invite token');
    }

    const expired = employee.inviteExpiresAt ? employee.inviteExpiresAt < new Date() : true;

    return {
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      expired,
    };
  }

  async setPassword(token: string, password: string, firstName?: string, lastName?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        inviteToken: token,
        inviteExpiresAt: { gt: new Date() },
        status: 'INVITED',
      },
    });

    if (!employee) {
      throw new BadRequestException('Invalid or expired invite token');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        inviteToken: null,
        inviteExpiresAt: null,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
      },
    });

    // Notify manager (or Super Admin) that a new team member has joined
    this.notifyNewTeamMember(employee.id, employee.tenantId, firstName || employee.firstName, lastName || employee.lastName, employee.departmentId).catch(() => {});

    return this.login(employee.email, password);
  }

  private async notifyNewTeamMember(
    employeeId: string,
    tenantId: string,
    firstName: string,
    lastName: string,
    departmentId: string | null,
  ) {
    const db = this.prisma.forTenant(tenantId);
    const fullName = `${firstName} ${lastName}`;
    const recipients: string[] = [];

    // AC1: Notify department manager
    if (departmentId) {
      const manager = await db.employee.findFirst({
        where: {
          managedDepartments: { some: { id: departmentId } },
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (manager) recipients.push(manager.id);
    }

    // AC2: If no department or no manager found, notify Super Admin(s)
    if (recipients.length === 0) {
      const superAdmins = await db.employee.findMany({
        where: { systemRole: 'SUPER_ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });
      recipients.push(...superAdmins.map((a) => a.id));
    }

    for (const recipientId of recipients) {
      await this.notificationService.createNotification({
        tenantId,
        recipientId,
        type: NotificationType.EMPLOYEE_JOINED,
        title: 'New team member joined',
        body: `New team member: ${fullName} has joined. Welcome them to the team!`,
        link: `/employees`,
        templateData: { employeeName: fullName },
      });
    }
  }

  async getProfile(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        systemRole: true,
        employmentType: true,
        status: true,
        tenantId: true,
        department: { select: { id: true, name: true } },
        employeeRoles: {
          select: { role: { select: { id: true, name: true, shortCode: true, color: true } } },
        },
      },
    });

    return employee;
  }

  private async generateTokens(userId: string, email: string, systemRole: string, tenantId: string) {
    const sessionId = uuidv4();
    const payload = { sub: userId, email, systemRole, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(
        { ...payload, sessionId, type: 'refresh' },
        { expiresIn: this.config.get('JWT_REFRESH_EXPIRY', '7d') },
      ),
    ]);

    return { accessToken, refreshToken, sessionId };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
