import { Global, Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { PermissionGuard } from './guards/permission.guard';
import { DatabaseModule } from '../database/database.module';
import { RoleAssignmentService } from './services/role-assignment.service';
import { RoleContextCacheService } from './services/role-context-cache.service';

@Global() 
@Module({
  imports: [DatabaseModule],
  providers: [
    PermissionService,
    RoleHierarchyService,
    PermissionGuard,
    RoleAssignmentService,
    RoleContextCacheService,
  ],
  exports: [
    PermissionService,
    RoleHierarchyService,
    PermissionGuard,
    RoleAssignmentService,
    RoleContextCacheService,
  ],
})
export class PermissionModule {}
