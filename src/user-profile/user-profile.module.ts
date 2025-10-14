import { Module } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { UserProfileController } from './user-profile.controller';
import { PrismaService } from '../database/prisma.service';
import { PermissionModule } from '../auth/permission.module';

@Module({
  imports: [PermissionModule],
  controllers: [UserProfileController],
  providers: [UserProfileService, PrismaService],
})
export class UserProfileModule {}
