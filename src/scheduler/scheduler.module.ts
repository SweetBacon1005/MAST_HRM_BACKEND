import { Module } from '@nestjs/common';
import { ScheduleAutomationService } from './services/schedule-automation.service';
import { LeaveManagementModule } from '../leave-management/leave-management.module';

@Module({
  imports: [LeaveManagementModule],
  providers: [ScheduleAutomationService],
  exports: [ScheduleAutomationService],
})
export class SchedulerModule {}
