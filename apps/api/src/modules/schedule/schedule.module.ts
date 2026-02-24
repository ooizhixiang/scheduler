import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { ScheduleController } from './schedule.controller';
import { ShiftController } from './shift.controller';
import { ScheduleService } from './schedule.service';
import { ShiftService } from './shift.service';
import { ConflictService } from './conflict.service';
import { ViewTrackingService } from './view-tracking.service';
import { ReminderTaskService } from './reminder-task.service';
import { AmendmentDiffService } from './amendment-diff.service';
import { PreviewService } from './preview.service';

@Module({
  imports: [NestScheduleModule.forRoot()],
  controllers: [ScheduleController, ShiftController],
  providers: [ScheduleService, ShiftService, ConflictService, ViewTrackingService, ReminderTaskService, AmendmentDiffService, PreviewService],
  exports: [ScheduleService, ShiftService, ViewTrackingService, AmendmentDiffService, PreviewService],
})
export class ScheduleModule {}
