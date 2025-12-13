import { Module } from '@nestjs/common';
import { DailyReportsController } from './daily-reports.controller';
import { DailyReportsService } from './daily-reports.service';
import { DatabaseModule } from '../database/database.module';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { AuthorizationContextService } from 'src/auth/services/authorization-context.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DailyReportsController],
  providers: [DailyReportsService, RoleAssignmentService, AuthorizationContextService],
})
export class DailyReportsModule {}
