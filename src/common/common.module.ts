import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityLogService } from './services/activity-log.service';
import { ip_validationService } from './services/ip-validation.service';
import { ActivityLogController } from './controllers/activity-log.controller';
import { IpManagementController } from './controllers/ip-management.controller';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [ActivityLogController, IpManagementController],
  providers: [ActivityLogService, ip_validationService],
  exports: [ActivityLogService, ip_validationService],
})
export class CommonModule {}