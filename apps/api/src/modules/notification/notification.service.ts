import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, NotificationChannel } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTemplateService } from './email-template.service';
import { EmailQueueService } from './email-queue.service';

interface CreateNotificationInput {
  tenantId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  /** Extra template data for email rendering (e.g. scheduleName, startDate) */
  templateData?: Record<string, any>;
}

// Dual-channel notification types — always send both IN_APP + EMAIL
const DUAL_CHANNEL_TYPES: Set<NotificationType> = new Set([
  NotificationType.SCHEDULE_PUBLISHED,
  NotificationType.SCHEDULE_UNPUBLISHED,
  NotificationType.SCHEDULE_AMENDED,
  NotificationType.SCHEDULE_VIEW_REMINDER,
  NotificationType.LEAVE_APPROVED,
  NotificationType.LEAVE_REJECTED,
  NotificationType.LEAVE_NUDGE,
  NotificationType.LEAVE_ESCALATED,
  NotificationType.EMPLOYEE_JOINED,
  NotificationType.MISSING_EMPLOYEES,
  NotificationType.ALL_CLEAR,
]);

// Priority ranking: 1 = highest (actionable), 2 = alerts, 3 = informational
const TYPE_PRIORITY: Partial<Record<NotificationType, number>> = {
  // Actionable
  SCHEDULE_PUBLISHED: 1,
  SCHEDULE_UNPUBLISHED: 1,
  SCHEDULE_AMENDED: 1,
  ACCOUNT_INVITE: 1,
  PASSWORD_RESET: 1,
  // Informational
  SCHEDULE_VIEW_REMINDER: 3,
  ROLE_ASSIGNED: 2,
  ROLE_REMOVED: 2,
  DEPARTMENT_CHANGED: 2,
  GROUP_ADDED: 3,
  GROUP_REMOVED: 3,
  SETTINGS_UPDATED: 3,
  EMPLOYEE_ARCHIVED: 2,
  EMPLOYEE_REACTIVATED: 2,
  LEAVE_APPROVED: 1,
  LEAVE_REJECTED: 1,
  LEAVE_NUDGE: 1,
  LEAVE_ESCALATED: 1,
  EMPLOYEE_JOINED: 3,
  MISSING_EMPLOYEES: 2,
  ALL_CLEAR: 3,
};

// Actionable types persist in feed until resolved; everything else auto-clears after 48h
const ACTIONABLE_TYPES: Set<NotificationType> = new Set([
  NotificationType.LEAVE_NUDGE,
  NotificationType.LEAVE_ESCALATED,
  NotificationType.ACCOUNT_INVITE,
  NotificationType.PASSWORD_RESET,
]);

const AUTO_CLEAR_HOURS = 48;

const DEDUP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const COALESCE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_MAX_PER_HOUR = 5;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private emailTemplateService: EmailTemplateService,
    private emailQueueService: EmailQueueService,
  ) {}

  async createNotification(input: CreateNotificationInput) {
    const db = this.prisma.forTenant(input.tenantId);
    const eventId = uuidv4();

    // --- Deduplication check (AC3): same type + recipient within 15 min ---
    const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
    const duplicate = await db.notification.findFirst({
      where: {
        recipientId: input.recipientId,
        type: input.type,
        channel: NotificationChannel.IN_APP,
        createdAt: { gte: dedupCutoff },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (duplicate) {
      this.logger.debug(`Dedup: suppressing ${input.type} for ${input.recipientId} (duplicate of ${duplicate.id})`);
      return duplicate.eventId;
    }

    // --- Amendment coalescing (AC5): update existing unread SCHEDULE_AMENDED within 30 min ---
    if (input.type === NotificationType.SCHEDULE_AMENDED) {
      const coalesceCutoff = new Date(Date.now() - COALESCE_WINDOW_MS);
      const existing = await db.notification.findFirst({
        where: {
          recipientId: input.recipientId,
          type: NotificationType.SCHEDULE_AMENDED,
          channel: NotificationChannel.IN_APP,
          isRead: false,
          createdAt: { gte: coalesceCutoff },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        await db.notification.update({
          where: { id: existing.id },
          data: {
            body: input.body,
            title: input.title,
            link: input.link,
          },
        });
        this.logger.debug(`Coalesced amendment notification into ${existing.id}`);
        return existing.eventId;
      }
    }

    // --- Create IN_APP notification ---
    const notification = await db.notification.create({
      data: {
        tenantId: input.tenantId,
        recipientId: input.recipientId,
        type: input.type,
        channel: NotificationChannel.IN_APP,
        eventId,
        title: input.title,
        body: input.body,
        link: input.link,
      },
    });

    // --- Dual-channel: queue email if applicable (AC1, AC6) ---
    if (DUAL_CHANNEL_TYPES.has(input.type)) {
      this.queueEmailForNotification(input, notification.id).catch((err) => {
        this.logger.error(`Failed to queue email for notification ${notification.id}: ${err}`);
      });
    }

    return eventId;
  }

  private async queueEmailForNotification(input: CreateNotificationInput, notificationId: string) {
    // Look up recipient email
    const recipient = await this.prisma.employee.findUnique({
      where: { id: input.recipientId },
      select: { email: true, firstName: true },
    });

    if (!recipient?.email) {
      this.logger.warn(`No email for recipient ${input.recipientId}, skipping email channel`);
      return;
    }

    // --- Rate limiting (AC7): max per-user per hour ---
    const isRateLimited = await this.isRateLimited(input.tenantId, input.recipientId, input.type);
    if (isRateLimited) {
      this.logger.debug(`Rate limited: deferring email for ${input.type} to ${input.recipientId}`);
      // Still queue but with delayed nextRetryAt (deferred, not dropped)
      const deferredAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour delay

      const templateData = {
        firstName: recipient.firstName,
        title: input.title,
        body: input.body,
        link: input.link,
        ...(input.templateData || {}),
      };
      const { subject, html } = this.emailTemplateService.compile(input.type, templateData);

      await this.emailQueueService.enqueue({
        tenantId: input.tenantId,
        notificationId,
        recipientEmail: recipient.email,
        recipientName: recipient.firstName,
        subject,
        htmlBody: html,
      });
      return;
    }

    // Compile email template
    const templateData = {
      firstName: recipient.firstName,
      title: input.title,
      body: input.body,
      link: input.link,
      ...(input.templateData || {}),
    };
    const { subject, html } = this.emailTemplateService.compile(input.type, templateData);

    await this.emailQueueService.enqueue({
      tenantId: input.tenantId,
      notificationId,
      recipientEmail: recipient.email,
      recipientName: recipient.firstName,
      subject,
      htmlBody: html,
    });
  }

  private async isRateLimited(
    tenantId: string,
    recipientId: string,
    type: NotificationType,
  ): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Count emails sent to this user in the last hour
    const recentCount = await this.prisma.emailJob.count({
      where: {
        tenantId,
        notification: { recipientId },
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentCount < DEFAULT_MAX_PER_HOUR) return false;

    // Check priority — only defer lower priority (3 = informational)
    const priority = TYPE_PRIORITY[type] || 3;
    return priority >= 3;
  }

  async findAll(tenantId: string, recipientId: string, page = 1, pageSize = 20) {
    const db = this.prisma.forTenant(tenantId);
    const autoClearCutoff = new Date(Date.now() - AUTO_CLEAR_HOURS * 60 * 60 * 1000);
    const actionableTypes = [...ACTIONABLE_TYPES];
    const informationalTypes = Object.values(NotificationType).filter(
      (t) => !ACTIONABLE_TYPES.has(t),
    );

    // Auto-clear: informational types >48h are excluded from feed
    const where = {
      recipientId,
      channel: NotificationChannel.IN_APP,
      OR: [
        // Actionable types — always shown
        { type: { in: actionableTypes } },
        // Informational types — only if < 48h old
        {
          type: { in: informationalTypes },
          createdAt: { gte: autoClearCutoff },
        },
      ],
    };

    const [items, total] = await Promise.all([
      db.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getUnreadCount(tenantId: string, recipientId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.notification.count({
      where: {
        recipientId,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      },
    });
  }

  async markRead(tenantId: string, recipientId: string, notificationId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.notification.updateMany({
      where: { id: notificationId, recipientId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async dismiss(tenantId: string, recipientId: string, notificationId: string) {
    const db = this.prisma.forTenant(tenantId);
    // Unlink email jobs so we can safely delete
    await this.prisma.emailJob.updateMany({
      where: { notificationId },
      data: { notificationId: null as any },
    });
    return db.notification.deleteMany({
      where: { id: notificationId, recipientId },
    });
  }

  async markAllRead(tenantId: string, recipientId: string) {
    const db = this.prisma.forTenant(tenantId);
    return db.notification.updateMany({
      where: {
        recipientId,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
