import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityLogService } from './services/activity-log.service';
import { IpValidationService } from './services/ip-validation.service';
import { ActivityLogController } from './controllers/activity-log.controller';
import { IpManagementController } from './controllers/ip-management.controller';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [ActivityLogController, IpManagementController],
  providers: [ActivityLogService, IpValidationService],
  exports: [ActivityLogService, IpValidationService],
})
export class CommonModule {}