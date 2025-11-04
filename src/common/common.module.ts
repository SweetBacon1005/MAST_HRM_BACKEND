import { Global, Module } from '@nestjs/common';
import { ActivityLogService } from './services/activity-log.service';
import { ActivityLogController } from './controllers/activity-log.controller';

@Global()
@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class CommonModule {}