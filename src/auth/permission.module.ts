import { Global, Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { PermissionGuard } from './guards/permission.guard';
import { DatabaseModule } from '../database/database.module';
import { RoleAssignmentService } from './services/role-assignment.service';

@Global() 
@Module({
  imports: [DatabaseModule],
  providers: [
    PermissionService,
    RoleHierarchyService,
    PermissionGuard,
    RoleAssignmentService,
  ],
  exports: [
    PermissionService,
    RoleHierarchyService,
    PermissionGuard,
    RoleAssignmentService,
  ],
})
export class PermissionModule {}
