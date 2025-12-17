import { Module } from '@nestjs/common';
import { LeaveBalanceService } from 'src/leave-management/services/leave-balance.service';
import { AttendanceRequestService } from 'src/requests/services/attendance-request.service';
import { DayOffDetailService } from 'src/requests/services/day-off-detail.service';
import { LateEarlyDetailService } from 'src/requests/services/late-early-detail.service';
import { OvertimeDetailService } from 'src/requests/services/overtime-detail.service';
import { CsvExportService } from '../common/services/csv-export.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceExportService } from './services/attendance-export.service';

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceRequestService,
    AttendanceExportService,
    DayOffDetailService,
    OvertimeDetailService,
    LateEarlyDetailService,
    LeaveBalanceService,
    CsvExportService,
  ],
  exports: [
    AttendanceService,
    AttendanceRequestService,
    DayOffDetailService,
    OvertimeDetailService,
    LateEarlyDetailService,
    LeaveBalanceService,
  ],
})
export class AttendanceModule {}
