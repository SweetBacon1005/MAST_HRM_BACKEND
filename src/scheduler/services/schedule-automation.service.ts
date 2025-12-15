import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import {
  WorkShiftType,
  RemoteType,
  DayOffType,
} from '@prisma/client';
import { LeaveBalanceService } from '../../leave-management/services/leave-balance.service';

const LEAVE_CONFIG = {
  MONTHLY_PAID_DAYS: 3,
  EXPIRED_SHIFTS_MONTHS: 3,
  SHIFT_EXTENSION_YEARS: 1,
} as const;

const WORK_HOURS = {
  MORNING_START: '08:00',
  MORNING_END: '12:00',
  AFTERNOON_START: '13:30',
  AFTERNOON_END: '17:30',
  OVERTIME_EVENING_START: '18:00',
  OVERTIME_EVENING_END: '20:00',
  OVERTIME_NIGHT_START: '20:30',
  OVERTIME_NIGHT_END: '22:00',
} as const;

@Injectable()
export class ScheduleAutomationService {
  private readonly logger = new Logger(ScheduleAutomationService.name);

  constructor(
    private prisma: PrismaService,
    private leaveBalanceService: LeaveBalanceService,
  ) {}

  // REMOVED: schedule_works management - Using hardcoded schedule
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async extendExpiringShifts() {
    this.logger.log('🔄 Skipping work shifts check - using hardcoded schedule');
    return; // Disabled - no longer using schedule_works table
    /*
    this.logger.log('🔄 Checking for expiring work shifts...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const expiringShifts = await this.prisma.schedule_works.findMany({
        where: {
          end_date: {
            gte: tomorrow,
            lte: nextWeek,
          },
          deleted_at: null,
          type: {
            in: [WorkShiftType.NORMAL, WorkShiftType.FLEXIBLE],
          },
        },
      });

      for (const shift of expiringShifts) {
        const newEndDate = new Date(shift.end_date);
        newEndDate.setFullYear(newEndDate.getFullYear() + LEAVE_CONFIG.SHIFT_EXTENSION_YEARS);

        await this.prisma.schedule_works.update({
          where: { id: shift.id },
          data: { end_date: newEndDate },
        });

        this.logger.log(
          `✅ Extended work shift "${shift.name}" until ${newEndDate.toISOString().split('T')[0]}`,
        );
      }

      this.logger.log(`🎉 Extended ${expiringShifts.length} work shifts`);
    } catch (error) {
      this.logger.error('❌ Error extending work shifts:', error);
    }
    */
  }

  @Cron('0 1 * * 0')
  async createWeeklyOvertimeShifts() {
    this.logger.log('⏰ Skipping overtime shifts - using hardcoded schedule');
    return; // Disabled
    /*
    this.logger.log('⏰ Creating overtime shifts for next week...');

    try {
      const nextMonday = this.getNextMonday();
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextSunday.getDate() + 6);

      const existingOvertime = await this.prisma.schedule_works.findFirst({
        where: {
          type: WorkShiftType.OVERTIME,
          start_date: nextMonday,
          end_date: nextSunday,
          deleted_at: null,
        },
      });

      if (!existingOvertime) {
        await this.prisma.schedule_works.create({
          data: {
            name: `Ca tăng ca tuần ${this.getWeekNumber(nextMonday)}`,
            type: WorkShiftType.OVERTIME,
            start_date: nextMonday,
            end_date: nextSunday,
            hour_start_morning: WORK_HOURS.OVERTIME_EVENING_START,
            hour_end_morning: WORK_HOURS.OVERTIME_EVENING_END,
            hour_start_afternoon: WORK_HOURS.OVERTIME_NIGHT_START,
            hour_end_afternoon: WORK_HOURS.OVERTIME_NIGHT_END,
          },
        });

        this.logger.log(
          `✅ Created overtime shift for week ${this.getWeekNumber(nextMonday)}`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Error creating overtime shifts:', error);
    }
    */
  }

  @Cron('0 3 1 * *')
  async cleanupExpiredShifts() {
    this.logger.log('🧹 Skipping cleanup - using hardcoded schedule');
    return; // Disabled
    /*
    this.logger.log('🧹 Cleaning up expired work shifts...');

    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - LEAVE_CONFIG.EXPIRED_SHIFTS_MONTHS);

      const result = await this.prisma.schedule_works.updateMany({
        where: {
          end_date: { lt: threeMonthsAgo },
          deleted_at: null,
          type: {
            in: [WorkShiftType.OVERTIME, WorkShiftType.PART_TIME],
          },
        },
        data: { deleted_at: new Date() },
      });

      this.logger.log(`🗑️ Cleaned up ${result.count} expired work shifts`);
    } catch (error) {
      this.logger.error('❌ Error cleaning up work shifts:', error);
    }
    */
  }

  @Cron('0 4 25 * *')
  async prepareNextMonthShifts() {
    this.logger.log('📅 Skipping next month preparation - using hardcoded schedule');
    return; // Disabled
    /*
    this.logger.log('📅 Preparing work shifts for next month...');

    try {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);

      const endOfNextMonth = new Date(nextMonth);
      endOfNextMonth.setMonth(endOfNextMonth.getMonth() + 1);
      endOfNextMonth.setDate(0);

      const existingShifts = await this.prisma.schedule_works.findMany({
        where: {
          start_date: { gte: nextMonth },
          end_date: { lte: endOfNextMonth },
          type: WorkShiftType.NORMAL,
          deleted_at: null,
        },
      });

      if (existingShifts.length === 0) {
        await this.prisma.schedule_works.create({
          data: {
            name: `Ca hành chính - ${nextMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`,
            type: WorkShiftType.NORMAL,
            start_date: nextMonth,
            end_date: endOfNextMonth,
            hour_start_morning: WORK_HOURS.MORNING_START,
            hour_end_morning: WORK_HOURS.MORNING_END,
            hour_start_afternoon: WORK_HOURS.AFTERNOON_START,
            hour_end_afternoon: WORK_HOURS.AFTERNOON_END,
          },
        });

        this.logger.log(
          `✅ Created work shift for ${nextMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Error preparing next month shifts:', error);
    }
    */
  }

  private getNextMonday(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    return nextMonday;
  }

  @Cron('0 0 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async createDailyTimesheets() {
    this.logger.log('📋 Creating daily timesheets for all active users...');

    try {
      await this.prisma.cleanupConnections();
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      const activeUsers = await this.prisma.users.findMany({
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          email: true,
        },
      });

      const dayOfWeek = today.getDay();
      const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;

      if (!isWorkingDay) {
        this.logger.log('📅 Today is weekend, skipping timesheet creation');
        return;
      }

      const existingTimesheets = await this.prisma.time_sheets.findMany({
        where: {
          work_date: new Date(todayString),
          deleted_at: null,
          user_id: {
            in: activeUsers.map((user) => user.id),
          },
        },
        select: {
          user_id: true,
        },
      });

      const existinguser_ids = new Set(
        existingTimesheets.map((ts) => ts.user_id),
      );

      const usersNeedTimesheet = activeUsers.filter(
        (user) => !existinguser_ids.has(user.id),
      );

      let createdCount = 0;
      const skippedCount = existinguser_ids.size;

      if (usersNeedTimesheet.length > 0) {
        const timesheetsToCreate = usersNeedTimesheet.map((user) => ({
          user_id: user.id,
          work_date: new Date(todayString),
          is_complete: false,
          remote: RemoteType.OFFICE,
          total_work_time: 0,
          late_time: 0,
          early_time: 0,
        }));

        const result = await this.prisma.time_sheets.createMany({
          data: timesheetsToCreate,
          skipDuplicates: true,
        });

        createdCount = result.count;

        this.logger.debug(
          `✅ Created timesheets for users: ${usersNeedTimesheet.map((u) => u.email).join(', ')}`,
        );
      }

      this.logger.log(
        `🎉 Daily timesheet creation completed: ${createdCount} created, ${skippedCount} skipped`,
      );
    } catch (error) {
      this.logger.error('❌ Error creating daily timesheets:', error);
    } finally {
      await this.prisma.cleanupConnections();
    }
  }

  @Cron('30 23 28-31 * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async addMonthlyPaidLeave() {
    this.logger.log('🏖️ Adding monthly paid leave days for all active users...');

    try {
      await this.prisma.cleanupConnections();
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isLastDayOfMonth = tomorrow.getDate() === 1;

      if (!isLastDayOfMonth) {
        this.logger.log(
          '📅 Not the last day of month, skipping paid leave addition',
        );
        return;
      }

      const activeUsers = await this.prisma.users.findMany({
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          email: true,
        },
      });

      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const monthlyLeaveDescription = `Phép tích lũy tháng ${currentMonth}/${currentYear}`;

      // Kiểm tra users đã được cộng phép trong tháng này chưa
      // Dựa vào last_reset_date hoặc logic khác để tránh cộng trùng
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const usersAlreadyUpdated = await this.prisma.user_leave_balances.findMany({
        where: {
          user_id: {
            in: activeUsers.map((user) => user.id),
          },
          OR: [
            {
              updated_at: {
                gte: firstDayOfMonth,
              },
            },
          ],
          deleted_at: null,
        },
        select: {
          user_id: true,
        },
      });

      const existinguser_ids = new Set(
        usersAlreadyUpdated.map((balance) => balance.user_id),
      );

      const usersNeedLeave = activeUsers.filter(
        (user) => !existinguser_ids.has(user.id),
      );

      let updatedCount = 0;

      for (const user of usersNeedLeave) {
        try {
          await this.leaveBalanceService.getOrCreateLeaveBalance(user.id);

          await this.leaveBalanceService.addLeaveBalance(
            user.id,
            LEAVE_CONFIG.MONTHLY_PAID_DAYS,
            DayOffType.PAID,
            monthlyLeaveDescription,
          );

          updatedCount++;
        } catch (error) {
          this.logger.error(
            `❌ Error adding leave for user ${user.id} (${user.email}):`,
            error,
          );
        }
      }

      this.logger.log('🔄 Resetting violation minutes and request quota for new month...');
      
      const resetDate = new Date(today);
      resetDate.setHours(0, 0, 0, 0);

      const resetResult = await this.prisma.user_leave_balances.updateMany({
        where: {
          user_id: {
            in: activeUsers.map((user) => user.id),
          },
          deleted_at: null,
        },
        data: {
          last_reset_date: resetDate,
        },
      });

      this.logger.log(
        `🎉 Monthly paid leave addition completed: ${updatedCount} users updated with +3 days paid leave`,
      );
      this.logger.log(
        `✅ Violation minutes and request quota reset completed: ${resetResult.count} users updated`,
      );
    } catch (error) {
      this.logger.error('❌ Error adding monthly paid leave:', error);
    } finally {
      await this.prisma.cleanupConnections();
    }
  }

  @Cron('0 1 1 1 *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async resetAnnualLeaveBalance() {
    this.logger.log('🔄 Resetting annual leave balance for all active users...');

    try {
      await this.prisma.cleanupConnections();
      const activeUsers = await this.prisma.users.findMany({
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          email: true,
        },
      });

      let processedCount = 0;
      let errorCount = 0;

      for (const user of activeUsers) {
        try {
          await this.leaveBalanceService.getOrCreateLeaveBalance(user.id);
          await this.leaveBalanceService.resetAnnualLeaveBalance(user.id);

          processedCount++;
        } catch (error) {
          this.logger.error(
            `❌ Error resetting leave balance for user ${user.id} (${user.email}):`,
            error,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `🎉 Annual leave balance reset completed: ${processedCount} processed, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error('❌ Error resetting annual leave balance:', error);
    } finally {
      await this.prisma.cleanupConnections();
    }
  }

  @Cron('0 5 1 * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async initializeNewUserLeaveBalance() {
    this.logger.log('🆕 Initializing leave balance for new users...');

    try {
      await this.prisma.cleanupConnections();
      const result = await this.leaveBalanceService.initializeLeaveBalanceForAllUsers();

      this.logger.log(
        `🎉 Leave balance initialization completed: ${result.createdCount} created, ${result.skippedCount} skipped`,
      );
    } catch (error) {
      this.logger.error('❌ Error initializing leave balance:', error);
    } finally {
      await this.prisma.cleanupConnections();
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
// End of commented deprecated schedule_works methods - see above */
