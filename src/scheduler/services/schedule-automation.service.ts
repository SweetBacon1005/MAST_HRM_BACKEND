import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { WorkShiftType, RemoteType, DayOffStatus, DayOffType } from '@prisma/client';

@Injectable()
export class ScheduleAutomationService {
  private readonly logger = new Logger(ScheduleAutomationService.name);

  constructor(private prisma: PrismaService) {}

  // Chạy hàng ngày lúc 2:00 AM - Gia hạn ca làm việc sắp hết hạn
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async extendExpiringShifts() {
    this.logger.log('🔄 Checking for expiring work shifts...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Tìm các ca sắp hết hạn trong 7 ngày tới
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

      // Tự động gia hạn thêm 1 năm cho các ca cơ bản
      for (const shift of expiringShifts) {
        const newEndDate = new Date(shift.end_date);
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);

        await this.prisma.schedule_works.update({
          where: { id: shift.id },
          data: { end_date: newEndDate },
        });

        this.logger.log(`✅ Extended work shift "${shift.name}" until ${newEndDate.toISOString().split('T')[0]}`);
      }

      this.logger.log(`🎉 Extended ${expiringShifts.length} work shifts`);
    } catch (error) {
      this.logger.error('❌ Error extending work shifts:', error);
    }
  }

  // Chạy vào Chủ nhật hàng tuần lúc 1:00 AM - Tạo ca tăng ca cho tuần tới
  @Cron('0 1 * * 0')
  async createWeeklyOvertimeShifts() {
    this.logger.log('⏰ Creating overtime shifts for next week...');

    try {
      const nextMonday = this.getNextMonday();
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextSunday.getDate() + 6);

      // Kiểm tra xem đã có ca tăng ca cho tuần tới chưa
      const existingOvertime = await this.prisma.schedule_works.findFirst({
        where: {
          type: WorkShiftType.OVERTIME,
          start_date: nextMonday,
          end_date: nextSunday,
          deleted_at: null,
        },
      });

      if (!existingOvertime) {
        // Tạo ca tăng ca cho tuần tới
        await this.prisma.schedule_works.create({
          data: {
            name: `Ca tăng ca tuần ${this.getWeekNumber(nextMonday)}`,
            type: WorkShiftType.OVERTIME,
            start_date: nextMonday,
            end_date: nextSunday,
            hour_start_morning: new Date('2024-01-01T18:00:00Z'),
            hour_end_morning: new Date('2024-01-01T20:00:00Z'),
            hour_start_afternoon: new Date('2024-01-01T20:30:00Z'),
            hour_end_afternoon: new Date('2024-01-01T22:00:00Z'),
          },
        });

        this.logger.log(`✅ Created overtime shift for week ${this.getWeekNumber(nextMonday)}`);
      }
    } catch (error) {
      this.logger.error('❌ Error creating overtime shifts:', error);
    }
  }

  // Chạy vào ngày 1 hàng tháng lúc 3:00 AM - Cleanup ca cũ
  @Cron('0 3 1 * *')
  async cleanupExpiredShifts() {
    this.logger.log('🧹 Cleaning up expired work shifts...');

    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Soft delete các ca đã hết hạn quá 3 tháng
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
  }

  // Chạy vào ngày 25 hàng tháng lúc 4:00 AM - Tạo ca cho tháng tới
  @Cron('0 4 25 * *')
  async prepareNextMonthShifts() {
    this.logger.log('📅 Preparing work shifts for next month...');

    try {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);

      const endOfNextMonth = new Date(nextMonth);
      endOfNextMonth.setMonth(endOfNextMonth.getMonth() + 1);
      endOfNextMonth.setDate(0);

      // Kiểm tra xem đã có ca cho tháng tới chưa
      const existingShifts = await this.prisma.schedule_works.findMany({
        where: {
          start_date: { gte: nextMonth },
          end_date: { lte: endOfNextMonth },
          type: WorkShiftType.NORMAL,
          deleted_at: null,
        },
      });

      if (existingShifts.length === 0) {
        // Tạo ca hành chính cho tháng tới
        await this.prisma.schedule_works.create({
          data: {
            name: `Ca hành chính - ${nextMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`,
            type: WorkShiftType.NORMAL,
            start_date: nextMonth,
            end_date: endOfNextMonth,
            hour_start_morning: new Date('2024-01-01T08:00:00Z'),
            hour_end_morning: new Date('2024-01-01T12:00:00Z'),
            hour_start_afternoon: new Date('2024-01-01T13:30:00Z'),
            hour_end_afternoon: new Date('2024-01-01T17:30:00Z'),
          },
        });

        this.logger.log(`✅ Created work shift for ${nextMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`);
      }
    } catch (error) {
      this.logger.error('❌ Error preparing next month shifts:', error);
    }
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

  // Chạy hàng ngày lúc 12:00 AM (00:00) theo giờ Việt Nam - Tạo timesheet cho ngày hôm đó
  @Cron('0 0 * * *', {
    timeZone: 'Asia/Ho_Chi_Minh'
  })
  async createDailyTimesheets() {
    this.logger.log('📋 Creating daily timesheets for all active users...');

    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      // Lấy tất cả user đang hoạt động (có contract active)
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

      // Kiểm tra xem hôm nay có phải ngày làm việc không (thứ 2-6)
      const dayOfWeek = today.getDay();
      const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;

      if (!isWorkingDay) {
        this.logger.log('📅 Today is weekend, skipping timesheet creation');
        return;
      }

      // Lấy danh sách user đã có timesheet hôm nay
      const existingTimesheets = await this.prisma.time_sheets.findMany({
        where: {
          work_date: new Date(todayString),
          deleted_at: null,
          user_id: {
            in: activeUsers.map(user => user.id),
          },
        },
        select: {
          user_id: true,
        },
      });

      const existingUserIds = new Set(existingTimesheets.map(ts => ts.user_id));
      
      // Lọc ra những user chưa có timesheet
      const usersNeedTimesheet = activeUsers.filter(user => !existingUserIds.has(user.id));

      let createdCount = 0;
      let skippedCount = existingUserIds.size;

      if (usersNeedTimesheet.length > 0) {
        // Tạo timesheet hàng loạt
        const timesheetsToCreate = usersNeedTimesheet.map(user => ({
          user_id: user.id,
          work_date: new Date(todayString),
          is_complete: false,
          remote: RemoteType.OFFICE, // Mặc định là làm việc tại văn phòng
          total_work_time: 0,
          late_time: 0,
          early_time: 0,
        }));

        const result = await this.prisma.time_sheets.createMany({
          data: timesheetsToCreate,
          skipDuplicates: true,
        });

        createdCount = result.count;
        
        this.logger.debug(`✅ Created timesheets for users: ${usersNeedTimesheet.map(u => u.name).join(', ')}`);
      }

      this.logger.log(`🎉 Daily timesheet creation completed: ${createdCount} created, ${skippedCount} skipped`);
    } catch (error) {
      this.logger.error('❌ Error creating daily timesheets:', error);
    }
  }

  // Chạy vào ngày cuối tháng lúc 11:30 PM theo giờ Việt Nam - Cộng thêm 3 ngày nghỉ phép có lương
  @Cron('30 23 28-31 * *', {
    timeZone: 'Asia/Ho_Chi_Minh'
  })
  async addMonthlyPaidLeave() {
    this.logger.log('🏖️ Adding monthly paid leave days for all active users...');

    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Kiểm tra xem ngày mai có phải ngày đầu tháng không
      const isLastDayOfMonth = tomorrow.getDate() === 1;

      if (!isLastDayOfMonth) {
        this.logger.log('📅 Not the last day of month, skipping paid leave addition');
        return;
      }

      // Lấy tất cả user đang hoạt động (có contract active)
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

      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const monthlyLeaveReason = `Cộng phép tháng ${currentMonth}/${currentYear}`;

      // Lấy danh sách user đã được cộng phép tháng này
      const existingMonthlyLeaves = await this.prisma.day_offs.findMany({
        where: {
          type: DayOffType.PAID,
          reason: monthlyLeaveReason,
          deleted_at: null,
          user_id: {
            in: activeUsers.map(user => user.id),
          },
        },
        select: {
          user_id: true,
        },
      });

      const existingLeaveUserIds = new Set(existingMonthlyLeaves.map(leave => leave.user_id));
      
      // Lọc ra những user chưa được cộng phép tháng này
      const usersNeedLeave = activeUsers.filter(user => !existingLeaveUserIds.has(user.id));

      let updatedCount = 0;

      if (usersNeedLeave.length > 0) {
        // Tạo bản ghi day_off hàng loạt
        const leavesToCreate = usersNeedLeave.map(user => ({
          user_id: user.id,
          type: DayOffType.PAID,
          start_date: today,
          end_date: today,
          total: 3, // 3 ngày
          reason: monthlyLeaveReason,
          note: 'Phép tích lũy hàng tháng - tự động cộng bởi hệ thống',
          status: DayOffStatus.APPROVED,
          approved_by: null, // System generated
          approved_at: new Date(),
        }));

        const result = await this.prisma.day_offs.createMany({
          data: leavesToCreate,
          skipDuplicates: true,
        });

        updatedCount = result.count;
        
        this.logger.debug(`✅ Added 3 days paid leave for users: ${usersNeedLeave.map(u => u.name).join(', ')} for month ${currentMonth}/${currentYear}`);
      }

      this.logger.log(`🎉 Monthly paid leave addition completed: ${updatedCount} users updated with +3 days paid leave`);
    } catch (error) {
      this.logger.error('❌ Error adding monthly paid leave:', error);
    }
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
