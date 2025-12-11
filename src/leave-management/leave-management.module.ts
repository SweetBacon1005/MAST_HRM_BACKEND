import { Module } from '@nestjs/common';
import { LeaveBalanceService } from './services/leave-balance.service';

@Module({
  providers: [LeaveBalanceService],
  exports: [LeaveBalanceService],
})
export class LeaveManagementModule {}
