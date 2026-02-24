import { Module } from '@nestjs/common';
import { ClockEventController } from './clock-event.controller';
import { ClockEventService } from './clock-event.service';
import { AttendanceTaskService } from './attendance-task.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ClockEventController],
  providers: [ClockEventService, AttendanceTaskService],
  exports: [ClockEventService],
})
export class ClockEventModule {}
