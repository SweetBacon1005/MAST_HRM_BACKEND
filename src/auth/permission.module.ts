import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PermissionService } from './services/permission.service';
import { PermissionHelperService } from './services/permission-helper.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { PermissionGuard } from './guards/permission.guard';

@Module({
  providers: [
    PrismaService,
    PermissionService,
    PermissionHelperService,
    RoleHierarchyService,
    PermissionGuard,
  ],
  exports: [
    PermissionService,
    PermissionHelperService,
    RoleHierarchyService,
    PermissionGuard,
  ],
})
export class PermissionModule {}
