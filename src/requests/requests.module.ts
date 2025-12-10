import { Module } from '@nestjs/common';
import { LeaveManagementModule } from '../leave-management/leave-management.module';
import { PermissionCheckerService } from '../auth/services/permission-checker.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { TimesheetModule } from 'src/timesheet/timesheet.module';

@Module({
  imports: [LeaveManagementModule, TimesheetModule],
  controllers: [RequestsController],
  providers: [RequestsService, PermissionCheckerService, ActivityLogService],
  exports: [RequestsService],
})
export class RequestsModule {}
