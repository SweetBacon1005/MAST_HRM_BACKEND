import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceExportService } from './services/attendance-export.service';
import { CsvExportService } from '../common/services/csv-export.service';

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceExportService,
    CsvExportService,
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
