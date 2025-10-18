import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ScheduleAutomationService } from './services/schedule-automation.service';
import { LeaveManagementModule } from '../leave-management/leave-management.module';

@Module({
  imports: [LeaveManagementModule],
  providers: [ScheduleAutomationService, PrismaService],
  exports: [ScheduleAutomationService],
})
export class SchedulerModule {}
