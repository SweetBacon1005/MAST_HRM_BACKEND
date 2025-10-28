import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { PrismaService } from '../database/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, PrismaService, ActivityLogService],
  exports: [AssetsService],
})
export class AssetsModule {}
