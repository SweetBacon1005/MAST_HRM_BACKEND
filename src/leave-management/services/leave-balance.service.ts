import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DayOffType, LeaveTransactionType } from '@prisma/client';

@Injectable()
export class LeaveBalanceService {
  private readonly logger = new Logger(LeaveBalanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lấy hoặc tạo leave balance cho user
   */
  async getOrCreateLeaveBalance(userId: number) {
    let balance = await this.prisma.user_leave_balances.findUnique({
      where: { user_id: userId },
    });

    if (!balance) {
      balance = await this.prisma.user_leave_balances.create({
        data: {
          user_id: userId,
          paid_leave_balance: 0,
          unpaid_leave_balance: 0,
          annual_paid_leave_quota: 36, // 3 ngày/tháng * 12 tháng
          carry_over_days: 0,
        },
      });

      this.logger.log(`Created leave balance for user ${userId}`);
    }

    return balance;
  }

  /**
   * Cộng ngày phép cho user
   */
  async addLeaveBalance(
    userId: number,
    amount: number,
    leaveType: DayOffType,
    transactionType: LeaveTransactionType,
    description: string,
    referenceId?: number,
    referenceType?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Lấy balance hiện tại
      const balance = await tx.user_leave_balances.findUnique({
        where: { user_id: userId },
      });

      if (!balance) {
        throw new BadRequestException(`User ${userId} không có leave balance`);
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
        where: { user_id: userId },
        data: {
          paid_leave_balance: newPaidBalance,
          unpaid_leave_balance: newUnpaidBalance,
        },
      });

      // Tạo transaction record
      await tx.leave_transactions.create({
        data: {
          user_id: userId,
          transaction_type: transactionType,
          leave_type: leaveType,
          amount: amount,
          balance_after: leaveType === DayOffType.PAID ? newPaidBalance : newUnpaidBalance,
          reference_id: referenceId,
          reference_type: referenceType,
          day_off_id: referenceType === 'day_off_refund' ? referenceId : undefined,
          description: description,
        },
      });

      this.logger.log(`Added ${amount} ${leaveType} leave days for user ${userId}. New balance: ${leaveType === DayOffType.PAID ? newPaidBalance : newUnpaidBalance}`);

      return updatedBalance;
    });
  }

  /**
   * Trừ ngày phép khi user sử dụng
   */
  async deductLeaveBalance(
    userId: number,
    amount: number,
    leaveType: DayOffType,
    dayOffId: number,
    description: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Lấy balance hiện tại
      const balance = await tx.user_leave_balances.findUnique({
        where: { user_id: userId },
      });

      if (!balance) {
        throw new BadRequestException(`User ${userId} không có leave balance`);
      }

      // Kiểm tra số dư
      const currentBalance = leaveType === DayOffType.PAID 
        ? balance.paid_leave_balance 
        : balance.unpaid_leave_balance;

      if (currentBalance < amount) {
        throw new BadRequestException(
          `Không đủ số dư phép ${leaveType}. Hiện có: ${currentBalance}, cần: ${amount}`
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
        where: { user_id: userId },
        data: {
          paid_leave_balance: newPaidBalance,
          unpaid_leave_balance: newUnpaidBalance,
        },
      });

      // Tạo transaction record với day_off_id
      const transaction = await tx.leave_transactions.create({
        data: {
          user_id: userId,
          transaction_type: LeaveTransactionType.USED,
          leave_type: leaveType,
          amount: -amount, // Số âm để thể hiện việc trừ
          balance_after: leaveType === DayOffType.PAID ? newPaidBalance : newUnpaidBalance,
          reference_id: dayOffId,
          reference_type: 'day_off',
          day_off_id: dayOffId, // Thêm direct reference
          description: description,
        },
      });

      // Cập nhật day_off để đánh dấu đã trừ balance
      await tx.day_offs.update({
        where: { id: dayOffId },
        data: {
          balance_deducted: true,
          deduction_transaction_id: transaction.id,
        },
      });

      this.logger.log(`Deducted ${amount} ${leaveType} leave days for user ${userId}. New balance: ${leaveType === DayOffType.PAID ? newPaidBalance : newUnpaidBalance}`);

      return { updatedBalance, transaction };
    });
  }

  /**
   * Hoàn trả ngày phép khi đơn bị từ chối hoặc hủy
   */
  async refundLeaveBalance(
    userId: number,
    amount: number,
    leaveType: DayOffType,
    dayOffId: number,
    description: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Kiểm tra xem day_off có đã trừ balance chưa
      const dayOff = await tx.day_offs.findUnique({
        where: { id: dayOffId },
        select: { balance_deducted: true, deduction_transaction_id: true },
      });

      if (!dayOff || !dayOff.balance_deducted) {
        throw new BadRequestException('Day-off này chưa trừ balance hoặc không tồn tại');
      }

      // Thực hiện refund
      const result = await this.addLeaveBalance(
        userId,
        amount,
        leaveType,
        LeaveTransactionType.ADJUSTED,
        description,
        dayOffId,
        'day_off_refund',
      );

      // Cập nhật day_off để đánh dấu đã hoàn trả
      await tx.day_offs.update({
        where: { id: dayOffId },
        data: {
          balance_deducted: false,
          deduction_transaction_id: null,
        },
      });

      return result;
    });
  }

  /**
   * Lấy lịch sử giao dịch phép của user
   */
  async getLeaveTransactionHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0,
  ) {
    return await this.prisma.leave_transactions.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Lấy thống kê leave balance của user
   */
  async getLeaveBalanceStats(userId: number) {
    const balance = await this.getOrCreateLeaveBalance(userId);
    
    // Lấy thống kê sử dụng trong năm hiện tại
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const yearlyStats = await this.prisma.leave_transactions.groupBy({
      by: ['leave_type', 'transaction_type'],
      where: {
        user_id: userId,
        created_at: {
          gte: yearStart,
          lte: yearEnd,
        },
        deleted_at: null,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      current_balance: {
        paid_leave: balance.paid_leave_balance,
        unpaid_leave: balance.unpaid_leave_balance,
      },
      annual_quota: balance.annual_paid_leave_quota,
      carry_over_days: balance.carry_over_days,
      yearly_usage: yearlyStats,
      last_reset_date: balance.last_reset_date,
    };
  }

  /**
   * Reset leave balance đầu năm
   */
  async resetAnnualLeaveBalance(userId: number) {
    return await this.prisma.$transaction(async (tx) => {
      const balance = await tx.user_leave_balances.findUnique({
        where: { user_id: userId },
      });

      if (!balance) {
        throw new BadRequestException(`User ${userId} không có leave balance`);
      }

      // Tính carry over (tối đa 12 ngày)
      const maxCarryOver = 12;
      const carryOverDays = Math.min(balance.paid_leave_balance, maxCarryOver);
      
      // Reset balance với carry over
      const updatedBalance = await tx.user_leave_balances.update({
        where: { user_id: userId },
        data: {
          paid_leave_balance: carryOverDays,
          carry_over_days: carryOverDays,
          last_reset_date: new Date(),
        },
      });

      // Tạo transaction record cho carry over
      if (carryOverDays > 0) {
        await tx.leave_transactions.create({
          data: {
            user_id: userId,
            transaction_type: LeaveTransactionType.CARRIED_OVER,
            leave_type: DayOffType.PAID,
            amount: carryOverDays,
            balance_after: carryOverDays,
            reference_type: 'annual_reset',
            description: `Chuyển phép năm ${new Date().getFullYear() - 1} sang năm ${new Date().getFullYear()}`,
          },
        });
      }

      // Tạo transaction record cho phần hết hạn (nếu có)
      const expiredDays = balance.paid_leave_balance - carryOverDays;
      if (expiredDays > 0) {
        await tx.leave_transactions.create({
          data: {
            user_id: userId,
            transaction_type: LeaveTransactionType.EXPIRED,
            leave_type: DayOffType.PAID,
            amount: -expiredDays,
            balance_after: carryOverDays,
            reference_type: 'annual_reset',
            description: `Hết hạn ${expiredDays} ngày phép năm ${new Date().getFullYear() - 1}`,
          },
        });
      }

      this.logger.log(`Reset annual leave for user ${userId}. Carried over: ${carryOverDays}, Expired: ${expiredDays}`);

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
        contracts: {
          some: {
            status: 'ACTIVE',
            deleted_at: null,
          },
        },
      },
      select: {
        id: true,
        name: true,
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

    this.logger.log(`Initialized leave balance: ${createdCount} created, ${skippedCount} skipped`);
    
    return { createdCount, skippedCount };
  }
}
