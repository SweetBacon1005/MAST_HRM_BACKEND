import { Global, Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { PermissionHelperService } from './services/permission-helper.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { PermissionGuard } from './guards/permission.guard';
import { DatabaseModule } from '../database/database.module';

@Global() // Làm cho PermissionModule global như DatabaseModule
@Module({
  imports: [DatabaseModule], // Import DatabaseModule để sử dụng PrismaService global
  providers: [
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
