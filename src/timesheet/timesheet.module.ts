import { Module } from '@nestjs/common';
import { TimesheetService } from './timesheet.service';
import { TimesheetController } from './timesheet.controller';
import { HttpModule } from '@nestjs/axios';
import { UploadModule } from '../upload/upload.module';
import { AttendanceRequestService } from 'src/requests/services/attendance-request.service';

@Module({
  imports: [HttpModule, UploadModule],
  controllers: [TimesheetController],
  providers: [TimesheetService, AttendanceRequestService],
  exports: [TimesheetService],
})
export class TimesheetModule {}
