import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ScheduleAutomationService } from './services/schedule-automation.service';

@Module({
  providers: [
    ScheduleAutomationService,
    PrismaService,
  ],
  exports: [ScheduleAutomationService],
})
export class SchedulerModule {}
