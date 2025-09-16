import { Module } from '@nestjs/common';
import { TimesheetService } from './timesheet.service';
import { TimesheetController } from './timesheet.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [TimesheetController],
  providers: [TimesheetService, PrismaService],
  exports: [TimesheetService],
})
export class TimesheetModule {}
