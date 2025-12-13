import { Module } from '@nestjs/common';
import { LeaveManagementModule } from '../leave-management/leave-management.module';
import { ActivityLogService } from '../common/services/activity-log.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { TimesheetModule } from 'src/timesheet/timesheet.module';
import { AuthorizationContextService } from 'src/auth/services/authorization-context.service';

@Module({
  imports: [LeaveManagementModule, TimesheetModule],
  controllers: [RequestsController],
  providers: [RequestsService, ActivityLogService, AuthorizationContextService],
  exports: [RequestsService],
})
export class RequestsModule {}
