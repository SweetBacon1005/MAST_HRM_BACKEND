import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DayOffType } from '@prisma/client';

@Injectable()
export class LeaveBalanceService {
  private readonly logger = new Logger(LeaveBalanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lấy hoặc tạo leave balance cho user
   */
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

  /**
   * Cộng ngày phép cho user
   */
  async addLeaveBalance(
    user_id: number,
    amount: number,
    leaveType: DayOffType,
    description?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Lấy balance hiện tại
      const balance = await tx.user_leave_balances.findUnique({
        where: { user_id: user_id },
      });

      if (!balance) {
        throw new BadRequestException(`User ${user_id} không có leave balance`);
      }

      // Tính toán balance mới
      let newPaidBalance = balance.paid_leave_balance;
      let newUnpaidBalance = balance.unpaid_leave_balance;

      if (leaveType === DayOffType.PAID) {
        newPaidBalance += amount;
      } else {
        newUnpaidBalance += amount;
      }

      // Cập nhật balance
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

  /**
   * Trừ ngày phép khi user sử dụng
   */
  async deductLeaveBalance(
    user_id: number,
    amount: number,
    leaveType: DayOffType,
    dayOffId: number,
    description?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Lấy balance hiện tại
      const balance = await tx.user_leave_balances.findUnique({
        where: { user_id: user_id },
      });

      if (!balance) {
        throw new BadRequestException(`User ${user_id} không có leave balance`);
      }

      // Kiểm tra số dư
      const currentBalance =
        leaveType === DayOffType.PAID
          ? balance.paid_leave_balance
          : balance.unpaid_leave_balance;

      if (currentBalance < amount) {
        throw new BadRequestException(
          `Không đủ số dư phép ${leaveType}. Hiện có: ${currentBalance}, cần: ${amount}`,
        );
      }

      // Tính toán balance mới
      let newPaidBalance = balance.paid_leave_balance;
      let newUnpaidBalance = balance.unpaid_leave_balance;

      if (leaveType === DayOffType.PAID) {
        newPaidBalance -= amount;
      } else {
        newUnpaidBalance -= amount;
      }

      // Cập nhật balance
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

  /**
   * Hoàn trả ngày phép khi đơn bị từ chối hoặc hủy
   */
  async refundLeaveBalance(
    user_id: number,
    amount: number,
    leaveType: DayOffType,
    dayOffId: number,
    description?: string,
  ) {
    // Thực hiện refund - cộng lại số phép đã trừ
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

  /**
   * Lấy thống kê leave balance của user
   */
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

  /**
   * Reset leave balance đầu năm
   */
  async resetAnnualLeaveBalance(user_id: number) {
    return await this.prisma.$transaction(async (tx) => {
      const balance = await tx.user_leave_balances.findUnique({
        where: { user_id: user_id },
      });

      if (!balance) {
        throw new BadRequestException(`User ${user_id} không có leave balance`);
      }

      // Tính carry over (tối đa 12 ngày)
      const maxCarryOver = 12;
      const carryOverDays = Math.min(balance.paid_leave_balance, maxCarryOver);
      const expiredDays = balance.paid_leave_balance - carryOverDays;

      // Reset balance với carry over
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

  /**
   * Tạo leave balance cho tất cả user active
   */
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
