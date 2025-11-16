import { Injectable } from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  TimesheetReportQueryDto,
  WorkingTimeReportQueryDto,
} from '../dto/attendance-statistics.dto';

@Injectable()
export class TimesheetReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Báo cáo timesheet theo phòng ban/team
   */
  async getTimesheetReport(reportDto: TimesheetReportQueryDto) {
    const { start_date, end_date, division_id, team_id } = reportDto;
    const startDate =
      start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    let userIds: number[] = [];

    if (Number(team_id)) {
      const teamAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: 'TEAM',
          scope_id: Number(team_id),
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      userIds = teamAssignments.map((assignment) => assignment.user_id);
    } else if (Number(division_id)) {
      const divisionAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: 'DIVISION',
          scope_id: Number(division_id),
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      userIds = divisionAssignments.map((assignment) => assignment.user_id);
    }

    const where: any = {
      work_date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      deleted_at: null,
    };

    if (userIds.length > 0) {
      where.user_id = { in: userIds };
    }

    const timesheets = await this.prisma.time_sheets.findMany({
      where,
      orderBy: { work_date: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, user_information: { select: { name: true } } },
        },
      },
    });

    // Thống kê tổng hợp
    const stats = {
      total_records: timesheets.length,
      total_late: timesheets.filter((t) => t.late_time && t.late_time > 0)
        .length,
      total_early_leave: timesheets.filter(
        (t) => t.early_time && t.early_time > 0,
      ).length,
      total_incomplete: timesheets.filter((t) => t.is_complete === false)
        .length,
      total_remote: timesheets.filter((t) => t.remote === 'REMOTE').length,
      average_work_hours:
        timesheets.reduce((sum, t) => {
          const workTime =
            (t.work_time_morning || 0) + (t.work_time_afternoon || 0);
          return sum + workTime;
        }, 0) /
        (timesheets.length || 1) /
        60,
    };

    return {
      timesheets,
      stats,
      period: { start_date: startDate, end_date: endDate },
    };
  }

  /**
   * Báo cáo thời gian làm việc theo tháng
   */
  async getWorkingTimeReport(reportDto: WorkingTimeReportQueryDto) {
    const { month, year, user_id } = reportDto;
    const currentDate = new Date();
    const reportYear =
      typeof year === 'string' ? Number(year) : year || currentDate.getFullYear();

    // Chuẩn hóa month
    let reportMonth: string;
    if (typeof month === 'number') {
      reportMonth = `${reportYear}-${String(month).padStart(2, '0')}`;
    } else if (typeof month === 'string' && month.includes('-')) {
      reportMonth = month;
    } else {
      reportMonth = `${reportYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    }

    const startDate = `${reportMonth}-01`;
    const endDate = new Date(
      parseInt(reportMonth.split('-')[0]),
      parseInt(reportMonth.split('-')[1]),
      0,
    )
      .toISOString()
      .split('T')[0];

    const where: Prisma.time_sheetsWhereInput = {
      work_date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      deleted_at: null,
    };

    if (user_id) {
      where.user_id = Number(user_id);
    }

    const timesheets = await this.prisma.time_sheets.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, user_information: { select: { name: true } } },
        },
      },
    });

    // Group by user
    const userStats = timesheets.reduce((acc: any, timesheet) => {
      const userId = timesheet.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          name: timesheet.user?.user_information?.name || '',
          total_days: 0,
          total_work_hours: 0,
          total_late_minutes: 0,
          total_early_minutes: 0,
          days_remote: 0,
        };
      }

      acc[userId].total_days += 1;
      acc[userId].total_work_hours +=
        ((timesheet.work_time_morning || 0) +
          (timesheet.work_time_afternoon || 0)) /
        60;
      acc[userId].total_late_minutes += timesheet.late_time || 0;
      acc[userId].total_early_minutes += timesheet.early_time || 0;
      acc[userId].days_remote += timesheet.remote === 'REMOTE' ? 1 : 0;

      return acc;
    }, {});

    return {
      period: reportMonth,
      user_stats: Object.values(userStats),
      summary: {
        total_users: Object.keys(userStats).length,
        total_working_days: (Object.values(userStats) as any[]).reduce(
          (sum: number, stat: any) => sum + stat.total_days,
          0,
        ),
        average_work_hours_per_day:
          Object.keys(userStats).length > 0
            ? (Object.values(userStats) as any[]).reduce(
                (sum: number, stat: any) => sum + stat.total_work_hours,
                0,
              ) / Object.keys(userStats).length
            : 0,
      },
    };
  }
}

