import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PermissionModule } from '../auth/permission.module';
import { DivisionService } from './division.service';
import { DivisionController } from './division.controller';

@Module({
  imports: [PermissionModule],
  controllers: [DivisionController],
  providers: [DivisionService, PrismaService],
  exports: [DivisionService],
})
export class DivisionModule {}
