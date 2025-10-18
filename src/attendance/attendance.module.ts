import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PermissionModule } from '../auth/permission.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceExportService } from './services/attendance-export.service';
import { CsvExportService } from '../common/services/csv-export.service';

@Module({
  imports: [PermissionModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceExportService,
    CsvExportService,
    PrismaService,
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
