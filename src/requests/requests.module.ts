import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  controllers: [RequestsController],
  providers: [
    PrismaService,
    RequestsService,
  ],
  exports: [RequestsService],
})
export class RequestsModule {}
