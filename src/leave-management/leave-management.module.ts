import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalanceService } from './services/leave-balance.service';

@Module({
  providers: [LeaveBalanceService, PrismaService],
  exports: [LeaveBalanceService],
})
export class LeaveManagementModule {}
