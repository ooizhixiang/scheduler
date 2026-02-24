import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailJobStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

interface EnqueueInput {
  tenantId: string;
  notificationId?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlBody: string;
}

// Backoff schedule: attempt 1 = 0s, attempt 2 = 2min, attempt 3 = 13min (~15 min total)
const BACKOFF_SECONDS = [0, 120, 780];
const QUEUE_INTERVAL_MS = 10_000; // 10 seconds
const BATCH_SIZE = 50; // Process up to 50 emails per tick

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private transporter: nodemailer.Transporter;
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: false,
    });
  }

  onModuleInit() {
    this.intervalRef = setInterval(() => this.processQueue(), QUEUE_INTERVAL_MS);
    this.logger.log('Email queue processor started (10s interval)');
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  async enqueue(input: EnqueueInput): Promise<string> {
    const job = await this.prisma.emailJob.create({
      data: {
        tenantId: input.tenantId,
        notificationId: input.notificationId,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        subject: input.subject,
        htmlBody: input.htmlBody,
        status: EmailJobStatus.PENDING,
        nextRetryAt: new Date(),
      },
    });
    return job.id;
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      const now = new Date();

      // Fetch batch of jobs ready to process
      const jobs = await this.prisma.emailJob.findMany({
        where: {
          status: { in: [EmailJobStatus.PENDING, EmailJobStatus.PROCESSING] },
          nextRetryAt: { lte: now },
        },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
      });

      if (jobs.length === 0) {
        this.processing = false;
        return;
      }

      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (err) {
      this.logger.error(`Queue processing error: ${err}`);
    } finally {
      this.processing = false;
    }
  }

  private async processJob(job: any) {
    const attempt = job.attempts + 1;

    // Mark as processing
    await this.prisma.emailJob.update({
      where: { id: job.id },
      data: { status: EmailJobStatus.PROCESSING, attempts: attempt },
    });

    try {
      await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM', 'noreply@scheduler.local'),
        to: job.recipientEmail,
        subject: job.subject,
        html: job.htmlBody,
      });

      await this.prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: EmailJobStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });
    } catch (err: any) {
      const errorMessage = err?.message || String(err);

      if (attempt >= job.maxAttempts) {
        // Max attempts reached — mark as failed
        await this.prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: EmailJobStatus.FAILED,
            lastError: errorMessage,
          },
        });
        this.logger.error(`Email job ${job.id} failed after ${attempt} attempts: ${errorMessage}`);
      } else {
        // Schedule retry with exponential backoff
        const backoffSeconds = BACKOFF_SECONDS[attempt] || BACKOFF_SECONDS[BACKOFF_SECONDS.length - 1];
        const nextRetry = new Date(Date.now() + backoffSeconds * 1000);

        await this.prisma.emailJob.update({
          where: { id: job.id },
          data: {
            status: EmailJobStatus.PENDING,
            lastError: errorMessage,
            nextRetryAt: nextRetry,
          },
        });
        this.logger.warn(`Email job ${job.id} attempt ${attempt} failed, retrying at ${nextRetry.toISOString()}`);
      }
    }
  }

  async getFailedJobs(tenantId: string, page = 1, pageSize = 20) {
    const where = { tenantId, status: EmailJobStatus.FAILED };

    const [items, total] = await Promise.all([
      this.prisma.emailJob.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailJob.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async retryFailedJob(jobId: string) {
    return this.prisma.emailJob.update({
      where: { id: jobId },
      data: {
        status: EmailJobStatus.PENDING,
        attempts: 0,
        lastError: null,
        nextRetryAt: new Date(),
      },
    });
  }
}
