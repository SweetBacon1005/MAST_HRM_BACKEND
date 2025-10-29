import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { PrismaService } from '../database/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PermissionService } from '../auth/services/permission.service';
import { RoleHierarchyService } from '../auth/services/role-hierarchy.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, PrismaService, ActivityLogService, PermissionService, RoleHierarchyService],
  exports: [AssetsService],
})
export class AssetsModule {}
