import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ActivityLogService } from './services/activity-log.service';
import { ActivityLogController } from './controllers/activity-log.controller';
import { PermissionService } from 'src/auth/services/permission.service';
import { RoleHierarchyService } from 'src/auth/services/role-hierarchy.service';

@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService, PrismaService, PermissionService, RoleHierarchyService],
  exports: [ActivityLogService],
})
export class CommonModule {}