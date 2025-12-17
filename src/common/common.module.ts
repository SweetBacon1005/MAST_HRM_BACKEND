import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ip_validationService } from './services/ip-validation.service';
import { IpManagementController } from './controllers/ip-management.controller';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [IpManagementController],
  providers: [ip_validationService],
  exports: [ip_validationService],
})
export class CommonModule {}