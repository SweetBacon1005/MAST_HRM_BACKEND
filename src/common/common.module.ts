import { Module, Global } from '@nestjs/common';
import { CsvExportService } from './services/csv-export.service';
import { EmailService } from './services/email.service';
import { UserQueryService } from './services/user-query.service';
import { QueryBuilderService } from './services/query-builder.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Common Module - Shared services across the application
 * @Global decorator makes these services available everywhere
 */
@Global()
@Module({
  providers: [
    CsvExportService,
    EmailService,
    UserQueryService,
    QueryBuilderService,
    PrismaService,
  ],
  exports: [
    CsvExportService,
    EmailService,
    UserQueryService,
    QueryBuilderService,
  ],
})
export class CommonModule {}

