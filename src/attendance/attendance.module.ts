import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PermissionModule } from '../auth/permission.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [PermissionModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService, 
    PrismaService,
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
