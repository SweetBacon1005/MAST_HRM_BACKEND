import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ScheduleAutomationService } from './services/schedule-automation.service';

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService, 
    PrismaService, 
    ScheduleAutomationService
  ],
  exports: [AttendanceService, ScheduleAutomationService],
})
export class AttendanceModule {}
