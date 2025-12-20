import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DayOffType } from '@prisma/client';

@Injectable()
export class LeaveBalanceService {
  private readonly logger = new Logger(LeaveBalanceService.name);

  constructor(private prisma: PrismaService) {}

  async getOrCreateLeaveBalance(user_id: number) {
    let balance = await this.prisma.user_leave_balances.findUnique({
      where: { user_id: user_id },
    });

    if (!balance) {
      balance = await this.prisma.user_leave_balances.create({
        data: {
          user_id: user_id,
          paid_leave_balance: 0,
          unpaid_leave_balance: 0,
          annual_paid_leave_quota: 36, // 3 ngày/tháng * 12 tháng
          carry_over_days: 0,
        },
      });

      this.logger.log(`Created leave balance for user ${user_id}`);
    }

    return balance;
  }

  async addLeaveBalance(
    user_id: number,
    amount: number,
    leaveType: DayOffType,
    description?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const balance = await tx.user_leave_balances.findUnique({
        where: { user_id: user_id },
      });

      if (!balance) {
        throw new BadRequestException(`User ${user_id} không có leave balance`);
      }

      let newPaidBalance = balance.paid_leave_balance;
      let newUnpaidBalance = balance.unpaid_leave_balance;

      if (leaveType === DayOffType.PAID) {
        newPaidBalance += amount;
      } else {
        newUnpaidBalance += amount;
      }

      const updatedBalance = await tx.user_leave_balances.update({
        where: { user_id: user_id },
        data: {
          paid_leave_balance: newPaidBalance,
          unpaid_leave_balance: newUnpaidBalance,
        },
      });

      this.logger.log(
        `Added ${amount} ${leaveType} leave days for user ${user_id}. New balance: ${leaveType === DayOffType.PAID ? newPaidBalance : newUnpaidBalance}`,
      );

      return updatedBalance;
    });
  }

  async deductLeaveBalance(
    user_id: number,
    amount: number,
    leaveType: DayOffType,
    dayOffId: number,
    description?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const balance = await tx.user_leave_balances.findUnique({
        where: { user_id: user_id },
      });

      if (!balance) {
        throw new BadRequestException(`User ${user_id} không có leave balance`);
      }

      const currentBalance =
        leaveType === DayOffType.PAID
          ? balance.paid_leave_balance
          : balance.unpaid_leave_balance;

      if (currentBalance < amount) {
        throw new BadRequestException(
          `Không đủ số dư phép ${leaveType}. Hiện có: ${currentBalance}, cần: ${amount}`,
        );
      }

      let newPaidBalance = balance.paid_leave_balance;
      let newUnpaidBalance = balance.unpaid_leave_balance;

      if (leaveType === DayOffType.PAID) {
        newPaidBalance -= amount;
      } else {
        newUnpaidBalance -= amount;
      }

      const updatedBalance = await tx.user_leave_balances.update({
        where: { user_id: user_id },
        data: {
          paid_leave_balance: newPaidBalance,
          unpaid_leave_balance: newUnpaidBalance,
        },
      });

      this.logger.log(
        `Deducted ${amount} ${leaveType} leave days for user ${user_id}. New balance: ${leaveType === DayOffType.PAID ? newPaidBalance : newUnpaidBalance}`,
      );

      return updatedBalance;
    });
  }

  async refundLeaveBalance(
    user_id: number,
    amount: number,
    leaveType: DayOffType,
    dayOffId: number,
    description?: string,
  ) {
    const result = await this.addLeaveBalance(
      user_id,
      amount,
      leaveType,
      description,
    );

    this.logger.log(
      `Refunded ${amount} ${leaveType} leave days for user ${user_id} (day_off_id: ${dayOffId})`,
    );

    return result;
  }

  async getLeaveBalanceStats(user_id: number) {
    const balance = await this.getOrCreateLeaveBalance(user_id);

    return {
      current_balance: {
        paid_leave: balance.paid_leave_balance,
        unpaid_leave: balance.unpaid_leave_balance,
      },
      annual_quota: balance.annual_paid_leave_quota,
      carry_over_days: balance.carry_over_days,
      last_reset_date: balance.last_reset_date,
    };
  }

  async resetAnnualLeaveBalance(user_id: number) {
    return await this.prisma.$transaction(async (tx) => {
      const balance = await tx.user_leave_balances.findUnique({
        where: { user_id: user_id },
      });

      if (!balance) {
        throw new BadRequestException(`User ${user_id} không có leave balance`);
      }

      const maxCarryOver = 12;
      const carryOverDays = Math.min(balance.paid_leave_balance, maxCarryOver);
      const expiredDays = balance.paid_leave_balance - carryOverDays;

      const updatedBalance = await tx.user_leave_balances.update({
        where: { user_id: user_id },
        data: {
          paid_leave_balance: carryOverDays,
          carry_over_days: carryOverDays,
          last_reset_date: new Date(),
        },
      });

      this.logger.log(
        `Reset annual leave for user ${user_id}. Carried over: ${carryOverDays}, Expired: ${expiredDays}`,
      );

      return updatedBalance;
    });
  }

  async initializeLeaveBalanceForAllUsers() {
    const activeUsers = await this.prisma.users.findMany({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
        user_information: { select: { name: true, avatar: true } },
        email: true,
      },
    });

    let createdCount = 0;
    let skippedCount = 0;

    for (const user of activeUsers) {
      const existingBalance = await this.prisma.user_leave_balances.findUnique({
        where: { user_id: user.id },
      });

      if (!existingBalance) {
        await this.prisma.user_leave_balances.create({
          data: {
            user_id: user.id,
            paid_leave_balance: 0,
            unpaid_leave_balance: 0,
            annual_paid_leave_quota: 36,
            carry_over_days: 0,
          },
        });
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    this.logger.log(
      `Initialized leave balance: ${createdCount} created, ${skippedCount} skipped`,
    );

    return { createdCount, skippedCount };
  }
}
