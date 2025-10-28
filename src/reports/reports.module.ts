import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaService } from '../database/prisma.service';
import { QueryBuilderService } from '../common/services/query-builder.service';
import { UserQueryService } from '../common/services/user-query.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, QueryBuilderService, UserQueryService],
  exports: [ReportsService],
})
export class ReportsModule {}

