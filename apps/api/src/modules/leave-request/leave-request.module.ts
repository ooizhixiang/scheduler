import { Module } from '@nestjs/common';
import { LeaveRequestController } from './leave-request.controller';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestTaskService } from './leave-request-task.service';

@Module({
  controllers: [LeaveRequestController],
  providers: [LeaveRequestService, LeaveRequestTaskService],
  exports: [LeaveRequestService],
})
export class LeaveRequestModule {}
