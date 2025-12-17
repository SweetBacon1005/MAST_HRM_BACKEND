import { Module } from '@nestjs/common';
import { LeaveManagementModule } from '../leave-management/leave-management.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { TimesheetModule } from 'src/timesheet/timesheet.module';
import { AuthorizationContextService } from 'src/auth/services/authorization-context.service';
import { AttendanceRequestService } from './services/attendance-request.service';
import { DayOffDetailService } from './services/day-off-detail.service';
import { RemoteWorkDetailService } from './services/remote-work-detail.service';
import { LateEarlyDetailService } from './services/late-early-detail.service';
import { ForgotCheckinDetailService } from './services/forgot-checkin-detail.service';
import { OvertimeDetailService } from './services/overtime-detail.service';

@Module({
  imports: [LeaveManagementModule, TimesheetModule],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    AuthorizationContextService,
    AttendanceRequestService,
    DayOffDetailService,
    RemoteWorkDetailService,
    LateEarlyDetailService,
    ForgotCheckinDetailService,
    OvertimeDetailService,
  ],
  exports: [RequestsService],
})
export class RequestsModule {}
