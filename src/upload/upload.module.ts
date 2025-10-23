import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { PermissionService } from 'src/auth/services/permission.service';
import { PrismaService } from 'src/database/prisma.service';
import { RoleHierarchyService } from 'src/auth/services/role-hierarchy.service';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [UploadService, PermissionService, PrismaService, RoleHierarchyService],
  exports: [UploadService],
})
export class UploadModule {}
