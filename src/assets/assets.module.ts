import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { PermissionService } from '../auth/services/permission.service';
import { RoleHierarchyService } from '../auth/services/role-hierarchy.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, PermissionService, RoleHierarchyService, RoleAssignmentService],
  exports: [AssetsService],
})
export class AssetsModule {}
