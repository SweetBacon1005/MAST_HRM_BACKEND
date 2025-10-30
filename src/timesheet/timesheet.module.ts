import { Module } from '@nestjs/common';
import { TimesheetService } from './timesheet.service';
import { TimesheetController } from './timesheet.controller';
import { HttpModule } from '@nestjs/axios';
import { PermissionModule } from '../auth/permission.module';

@Module({
  imports: [HttpModule, PermissionModule],
  controllers: [TimesheetController],
  providers: [TimesheetService],
  exports: [TimesheetService],
})
export class TimesheetModule {}
