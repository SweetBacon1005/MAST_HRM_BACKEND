import { Module } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { UserProfileController } from './user-profile.controller';
import { PermissionModule } from '../auth/permission.module';

// CRUD Services are now integrated into UserProfileService

@Module({
  imports: [PermissionModule],
  controllers: [UserProfileController],
  providers: [
    UserProfileService,
  ],
  exports: [
    UserProfileService,
  ],
})
export class UserProfileModule {}
