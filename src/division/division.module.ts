import { Module } from '@nestjs/common';
import { PermissionModule } from '../auth/permission.module';
import { DivisionService } from './division.service';
import { DivisionController } from './division.controller';

@Module({
  imports: [PermissionModule],
  controllers: [DivisionController],
  providers: [DivisionService],
  exports: [DivisionService],
})
export class DivisionModule {}
