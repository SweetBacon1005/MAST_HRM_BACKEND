import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LeaveManagementModule } from '../leave-management/leave-management.module';
import { PermissionModule } from '../auth/permission.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [LeaveManagementModule, PermissionModule],
  controllers: [RequestsController],
  providers: [PrismaService, RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
