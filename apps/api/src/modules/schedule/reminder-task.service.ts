import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ViewTrackingService } from './view-tracking.service';

@Injectable()
export class ReminderTaskService {
  private readonly logger = new Logger(ReminderTaskService.name);

  constructor(private viewTrackingService: ViewTrackingService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async handleViewReminders() {
    this.logger.log('Running scheduled view reminder check...');
    try {
      const result = await this.viewTrackingService.sendRemindersAllTenants();
      this.logger.log(`View reminder check complete: ${result.total} reminders sent`);
    } catch (err) {
      this.logger.error(`View reminder check failed: ${err}`);
    }
  }
}
