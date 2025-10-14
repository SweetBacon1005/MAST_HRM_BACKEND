import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PermissionService } from './services/permission.service';
import { PermissionHelperService } from './services/permission-helper.service';
import { PermissionGuard } from './guards/permission.guard';

@Module({
  providers: [
    PrismaService,
    PermissionService,
    PermissionHelperService,
    PermissionGuard,
  ],
  exports: [
    PermissionService,
    PermissionHelperService,
    PermissionGuard,
  ],
})
export class PermissionModule {}
