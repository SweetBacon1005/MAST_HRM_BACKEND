import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { QueryBuilderService } from '../common/services/query-builder.service';
import { UserQueryService } from '../common/services/user-query.service';
import { DatabaseModule } from '../database/database.module';
import { TimesheetReportsService } from './services/timesheet-reports.service';
import { MonthlyWorkSummaryService } from './services/monthly-work-summary.service';
import { MonthlyWorkSummaryExportService } from './services/monthly-work-summary-export.service';
import { CsvExportService } from '../common/services/csv-export.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [
    ReportsService, 
    QueryBuilderService, 
    UserQueryService,
    TimesheetReportsService,
    MonthlyWorkSummaryService,
    MonthlyWorkSummaryExportService,
    CsvExportService,
  ],
  exports: [
    ReportsService,
    TimesheetReportsService,
    MonthlyWorkSummaryService,
    MonthlyWorkSummaryExportService,
  ],
})
export class ReportsModule {}

