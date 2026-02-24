import { Global, Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailTemplateService } from './email-template.service';
import { EmailQueueService } from './email-queue.service';

@Global()
@Module({
  controllers: [NotificationController],
  providers: [NotificationService, EmailTemplateService, EmailQueueService],
  exports: [NotificationService, EmailQueueService],
})
export class NotificationModule {}
