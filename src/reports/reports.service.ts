import { Injectable, Logger } from '@nestjs/common';
import {
  ApprovalStatus,
  DayOffDuration,
  DayOffType,
  RemoteType,
  ScopeType,
  AttendanceRequestType,
} from '@prisma/client';
import { QueryBuilderService } from '../common/services/query-builder.service';
import { UserQueryService } from '../common/services/user-query.service';
import { PenaltyByUser } from '../common/types/penalty.types';
import {
  AttendanceLogWhereInput,
  DayOffWhereInput,
  TimesheetWhereInput,
} from '../common/types/prisma-where.types';
import {
  LeaveBalance,
  PeriodStats,
  UserStatsMap,
  ViolationStats,
} from '../common/types/response.types';
import { PrismaService } from '../database/prisma.service';
import {
  AttendanceDashboardQueryDto,
  AttendanceStatisticsDto,
  TimesheetReportQueryDto,
  WorkingTimeReportQueryDto,
} from './dto/attendance-statistics.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userQuery: UserQueryService,
    private readonly queryBuilder: QueryBuilderService,
  ) {}

  // === API TỪ TIMESHEET.SERVICE.TS ===

  /**
   * Báo cáo timesheet theo khoảng thời gian (Merged with generateAttendanceReport)
   * @param reportDto - Query parameters
   * @param reportType - Loại báo cáo: 'default' | 'summary' | 'detailed' | 'penalty'
   */
  async getTimesheetReport(
    reportDto: TimesheetReportQueryDto,
    reportType?: 'default' | 'summary' | 'detailed' | 'penalty',
  ) {
    const { start_date, end_date, division_id, team_id } = reportDto;
    const startDate =
      start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const user_ids = await this.userQuery.getuser_idsByDivisionOrTeam({
      division_id: Number(division_id),
      team_id: Number(team_id),
    });

    const where = this.queryBuilder.buildTimesheetWhereClause({
      startDate,
      endDate,
      user_ids,
    });

    const timesheets = await this.prisma.time_sheets.findMany({
      where,
      orderBy: { work_date: 'desc' },
    });

    // Nếu có reportType, trả về theo format tương ứng
    if (reportType && reportType !== 'default') {
      const period = `${startDate} - ${endDate}`;
      switch (reportType) {
        case 'summary':
          return this.generateSummaryReport(timesheets, period);
        case 'detailed':
          return this.generateDetailedReport(timesheets, period);
        case 'penalty':
          return this.generatePenaltyReport(timesheets, period);
      }
    }

    if (user_ids.length > 0) {
      await this.userQuery.getBasicUserInfo(user_ids);
    }

    // Thống kê tổng hợp
    const stats = {
      total_records: timesheets.length,
      total_late: 0,  // REMOVED: late_time
      total_early_leave: 0,  // REMOVED: early_time
      total_incomplete: timesheets.filter((t) => t.is_complete === false)
        .length,
      total_remote: timesheets.filter((t) => t.remote === 'REMOTE').length,
      average_work_hours:
        timesheets.reduce((sum, t) => sum + (t.total_work_time || 0), 0) /
        (timesheets.length || 1) /
        60, // Convert minutes to hours
    };

    return {
      timesheets,
      stats,
      period: { start_date: startDate, end_date: endDate },
    };
  }

  /**
   * Báo cáo thời gian làm việc theo tháng/năm
   */
  async getWorkingTimeReport(reportDto: WorkingTimeReportQueryDto) {
    const { month, year, user_id } = reportDto;
    const currentDate = new Date();
    const reportYear =
      typeof year === 'string' ? Number(year) : currentDate.getFullYear();

    // Chuẩn hóa month - có thể là số (1-12) hoặc string "YYYY-MM"
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

    const where: TimesheetWhereInput = {
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
    });

    // Group by user - TYPE SAFE
    const userStats = timesheets.reduce((acc: UserStatsMap, timesheet) => {
      const user_id = timesheet.user_id;
      if (!acc[user_id]) {
        acc[user_id] = {
          user_id: user_id,
          total_days: 0,
          total_work_hours: 0,
          total_ot_hours: 0,
          total_late_minutes: 0,
          total_early_minutes: 0,
          days_remote: 0,
        };
      }

      const userStat = acc[user_id];
      userStat.total_days += 1;
      userStat.total_work_hours += (timesheet.total_work_time || 0) / 60;
      // REMOVED: late/early time tracking
      userStat.total_late_minutes += 0;
      userStat.total_early_minutes += 0;
      if (userStat.days_remote !== undefined) {
        userStat.days_remote += timesheet.remote ? 1 : 0;
      }

      return acc;
    }, {});

    return {
      period: reportMonth,
      user_stats: Object.values(userStats),
      summary: {
        total_users: Object.keys(userStats).length,
        total_working_days: Object.values(userStats).reduce(
          (sum, stat) => sum + stat.total_days,
          0,
        ),
        average_work_hours_per_day:
          Object.keys(userStats).length > 0
            ? Object.values(userStats).reduce(
                (sum, stat) => sum + stat.total_work_hours,
                0,
              ) / Object.keys(userStats).length
            : 0,
      },
    };
  }

  /**
   * Thống kê chấm công chi tiết
   */
  async getAttendanceStatistics(statisticsDto: AttendanceStatisticsDto) {
    const { user_id, start_date, end_date } = statisticsDto;

    // Mặc định lấy thống kê tháng hiện tại
    const now = new Date();
    const defaultStartDate =
      start_date ||
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const defaultEndDate =
      end_date ||
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

    const where: TimesheetWhereInput = {
      work_date: {
        gte: new Date(defaultStartDate),
        lte: new Date(defaultEndDate),
      },
      deleted_at: null,
    };

    if (user_id) {
      where.user_id = Number(user_id);
    }

    // Lấy timesheets trong khoảng thời gian
    const timesheets = await this.prisma.time_sheets.findMany({
      where,
      orderBy: { work_date: 'desc' },
    });

    // Lấy overtime requests đã được approve
    const overtimeRequests = await this.prisma.attendance_requests.findMany({
      where: {
        ...(user_id && { user_id: Number(user_id) }),
        work_date: {
          gte: new Date(defaultStartDate),
          lte: new Date(defaultEndDate),
        },
        status: 'APPROVED',
        request_type: 'OVERTIME',
        deleted_at: null,
      },
      include: {
        overtime: true,
      },
    });

    // Lấy day-off requests trong khoảng thời gian
    const dayOffRequests = await this.prisma.attendance_requests.findMany({
      where: {
        ...(user_id && { user_id: Number(user_id) }),
        work_date: {
          gte: new Date(defaultStartDate),
          lte: new Date(defaultEndDate),
        },
        status: 'APPROVED',
        request_type: 'DAY_OFF',
        deleted_at: null,
      },
      include: {
        day_off: true,
      },
    });

    // Tính toán thống kê attendance
    const totalDays = timesheets.length;
    const completeDays = timesheets.filter((t) => t.is_complete).length;
    // REMOVED: Late/early tracking
    const lateDays = 0;
    const earlyLeaveDays = 0;
    const totallate_minutes = 0;
    const totalearly_minutes = 0;

    // Tính toán thống kê overtime
    const totalOvertimeHours = overtimeRequests.reduce((sum, ot) => {
      if (ot.overtime?.start_time && ot.overtime?.end_time) {
        const startMinutes = ot.overtime.start_time.getHours() * 60 + ot.overtime.start_time.getMinutes();
        const endMinutes = ot.overtime.end_time.getHours() * 60 + ot.overtime.end_time.getMinutes();
        return sum + (endMinutes - startMinutes) / 60;
      }
      return sum;
    }, 0);
    const overtimeCount = overtimeRequests.length;

    // Tính toán thống kê leave
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    const startDateObj = new Date(defaultStartDate);
    const endDateObj = new Date(defaultEndDate);

    dayOffRequests.forEach((dayOff) => {
      const leaveStart = new Date(
        Math.max(dayOff.work_date.getTime(), startDateObj.getTime()),
      );
      const leaveEnd = new Date(
        Math.min(dayOff.work_date.getTime(), endDateObj.getTime()),
      );

      if (leaveStart <= leaveEnd) {
        const actualLeaveDays = dayOff.day_off?.duration === 'FULL_DAY' ? 1 : 0.5;

        if (dayOff.day_off?.type === 'PAID') {
          paidLeaveDays += actualLeaveDays;
        } else {
          unpaidLeaveDays += actualLeaveDays;
        }
      }
    });

    // Tính tổng số ngày làm việc trong tháng (trừ cuối tuần và ngày lễ)
    const workingDaysInMonth = this.calculateWorkingDaysInMonth(
      defaultStartDate,
      defaultEndDate,
    );

    // Tính số ngày có timesheet vs số ngày cần làm việc
    const fullDayOffCount = dayOffRequests.filter(
      (req) => req.day_off && req.day_off.duration === 'FULL_DAY',
    ).length;
    const expectedWorkDays = workingDaysInMonth - fullDayOffCount;

    return {
      period: {
        start_date: defaultStartDate,
        end_date: defaultEndDate,
      },
      total_work_days: `${completeDays}/${expectedWorkDays}`,
      overtime_hours: totalOvertimeHours,
      late_minutes: totallate_minutes,
      violation_time: `${lateDays + earlyLeaveDays}/${totalDays}`,
      paid_leave_hours: paidLeaveDays * 8,
      unpaid_leave_hours: unpaidLeaveDays * 8,
      attendance: {
        total_days: `${completeDays}/${expectedWorkDays}`,
        complete_days: completeDays,
        working_days_in_month: workingDaysInMonth,
        late: totallate_minutes,
        late_days: lateDays,
        early_leave: `${earlyLeaveDays}/${totalDays}`,
        early_leave_days: earlyLeaveDays,
        early_leave_minutes: totalearly_minutes,
      },
      overtime: {
        total_hours: totalOvertimeHours,
        total_requests: overtimeCount,
      },
      leave: {
        paid_leave: paidLeaveDays,
        unpaid_leave: unpaidLeaveDays,
        total_leave_requests: dayOffRequests.length,
      },
      summary: {
        attendance_rate:
          expectedWorkDays > 0
            ? Math.round((completeDays / expectedWorkDays) * 100)
            : 0,
        punctuality_rate:
          totalDays > 0
            ? Math.round(((totalDays - lateDays) / totalDays) * 100)
            : 100,
      },
    };
  }

  // === API TỪ ATTENDANCE.SERVICE.TS ===

  /**
   * Dashboard chấm công với phân tích chi tiết
   * (Bao gồm: daily_stats, violation_stats, leave_stats theo division/team)
   */
  async getAttendanceDashboard(dashboardDto: AttendanceDashboardQueryDto) {
    const { start_date, end_date, division_id, team_id, period_type } =
      dashboardDto;

    const startDate =
      start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // Lấy danh sách user theo phòng ban/team
    let user_ids: number[] = [];
    if (team_id) {
      const teamAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.TEAM,
          scope_id: team_id,
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      user_ids = teamAssignments.map((assignment) => assignment.user_id);
    } else if (division_id) {
      const divisionAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.DIVISION,
          scope_id: division_id,
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      user_ids = divisionAssignments.map((assignment) => assignment.user_id);
    }

    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    const whereTimesheet: TimesheetWhereInput = {
      work_date: {
        gte: startDateTime,
        lte: endDateTime,
      },
      deleted_at: null,
    };

    if (user_ids.length > 0) {
      whereTimesheet.user_id = { in: user_ids };
    }

    // Thống kê tổng quan
    const timesheets = await this.prisma.time_sheets.findMany({
      where: whereTimesheet,
    });

    const totalRecords = timesheets.length;
    // REMOVED: Late/early tracking
    const onTimeRecords = timesheets.length;
    const lateRecords = 0;
    const earlyLeaveRecords = 0;
    const remoteRecords = timesheets.filter(
      (t) => t.remote === 'REMOTE',
    ).length;
    const totalPenalties = 0;

    // Thống kê theo ngày
    const dailyStats = this.groupAttendanceByPeriod(
      timesheets,
      period_type || 'daily',
    );

    // Top vi phạm
    const violationStats = await this.getViolationStatistics(
      user_ids,
      startDate,
      endDate,
    );

    // Thống kê nghỉ phép
    const leaveStats = await this.getLeaveStatistics(
      user_ids,
      startDate,
      endDate,
    );

    return {
      overview: {
        total_records: totalRecords,
        on_time_rate:
          totalRecords > 0
            ? ((onTimeRecords / totalRecords) * 100).toFixed(2)
            : 0,
        late_rate:
          totalRecords > 0
            ? ((lateRecords / totalRecords) * 100).toFixed(2)
            : 0,
        early_leave_rate:
          totalRecords > 0
            ? ((earlyLeaveRecords / totalRecords) * 100).toFixed(2)
            : 0,
        remote_rate:
          totalRecords > 0
            ? ((remoteRecords / totalRecords) * 100).toFixed(2)
            : 0,
        total_penalties: totalPenalties,
      },
      daily_stats: dailyStats,
      violation_stats: violationStats,
      leave_stats: leaveStats,
      period: { start_date: startDate, end_date: endDate },
    };
  }

  // === API TỪ AUTH/CONTROLLERS/REPORTS.CONTROLLER.TS ===

  /**
   * Báo cáo tổng hợp chấm công
   * FIXED: Dùng time_sheets thay vì attendance_logs để có dữ liệu đã xử lý
   */
  async getAttendanceSummary(
    startDate?: string,
    endDate?: string,
    division_id?: number,
  ) {
    const now = new Date();
    const defaultStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const where: TimesheetWhereInput = {
      work_date: {
        gte: new Date(defaultStartDate),
        lte: new Date(defaultEndDate),
      },
      deleted_at: null,
    };

    if (division_id) {
      // Lấy user IDs từ user_role_assignment
      const assignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.DIVISION,
          scope_id: division_id,
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      const user_ids = assignments.map((a) => a.user_id);
      where.user_id = { in: user_ids };
    }

    // Lấy timesheets và tính toán thống kê
    const timesheets = await this.prisma.time_sheets.findMany({
      where,
      select: {
        user_id: true,
        work_date: true,
        checkin: true,
        checkout: true,
        is_complete: true,
        // REMOVED: late_time, early_time, work_time_morning/afternoon
        total_work_time: true,
        remote: true,
      },
    });

    // Group by user và tính toán
    const userStatsMap = new Map<number, {
      total_days: number;
      complete_days: number;
      late_count: number;
      early_leave_count: number;
      total_work_hours: number;
      remote_days: number;
      earliest_checkin?: Date;
      latest_checkout?: Date;
    }>();

    timesheets.forEach((ts) => {
      const existing = userStatsMap.get(ts.user_id) || {
        total_days: 0,
        complete_days: 0,
        late_count: 0,
        early_leave_count: 0,
        total_work_hours: 0,
        remote_days: 0,
      };

      existing.total_days += 1;
      if (ts.is_complete) existing.complete_days += 1;
      // REMOVED: late/early tracking
      if (ts.remote === RemoteType.REMOTE) existing.remote_days += 1;

      const workHours = (ts.total_work_time || 0) / 60;
      existing.total_work_hours += workHours;

      if (ts.checkin && (!existing.earliest_checkin || ts.checkin < existing.earliest_checkin)) {
        existing.earliest_checkin = ts.checkin;
      }
      if (ts.checkout && (!existing.latest_checkout || ts.checkout > existing.latest_checkout)) {
        existing.latest_checkout = ts.checkout;
      }

      userStatsMap.set(ts.user_id, existing);
    });

    // Lấy thông tin user
    const user_ids = Array.from(userStatsMap.keys());
    const users = await this.prisma.users.findMany({
      where: { id: { in: user_ids } },
      select: {
        id: true,
        user_information: { select: { name: true } },
        email: true,
      },
    });

    // Lấy division names
    const divisionAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: { in: user_ids },
        scope_type: ScopeType.DIVISION,
        deleted_at: null,
        scope_id: { not: null },
      },
      select: { user_id: true, scope_id: true },
      distinct: ['user_id'],
    });

    const division_ids = [...new Set(divisionAssignments.map((a) => a.scope_id).filter((id): id is number => id !== null))];
    const divisions = await this.prisma.divisions.findMany({
      where: { id: { in: division_ids } },
      select: { id: true, name: true },
    });

    const divisionMap = new Map(divisions.map((d) => [d.id, d.name]));
    const userDivisionMap = new Map<number, string>();
    divisionAssignments.forEach((a) => {
      if (a.scope_id && !userDivisionMap.has(a.user_id)) {
        const divisionName = divisionMap.get(a.scope_id);
        if (divisionName) {
          userDivisionMap.set(a.user_id, divisionName);
        }
      }
    });

    // Tạo kết quả
    const result = Array.from(userStatsMap.entries()).map(([user_id, stats]) => {
      const user = users.find((u) => u.id === user_id);
      return {
        user_id,
        user_name: user?.user_information?.name || 'Unknown',
        user_email: user?.email || '',
        division: userDivisionMap.get(user_id) || '',
        total_days: stats.total_days,
        complete_days: stats.complete_days,
        late_count: stats.late_count,
        early_leave_count: stats.early_leave_count,
        total_work_hours: parseFloat(stats.total_work_hours.toFixed(2)),
        remote_days: stats.remote_days,
        earliest_checkin: stats.earliest_checkin,
        latest_checkout: stats.latest_checkout,
        attendance_rate: stats.total_days > 0 
          ? parseFloat(((stats.complete_days / stats.total_days) * 100).toFixed(2))
          : 0,
      };
    });

    return {
      period: { start_date: defaultStartDate, end_date: defaultEndDate },
      division_id: division_id,
      data: result,
      total_records: result.length,
    };
  }

  /**
   * Thống kê đi muộn về sớm
   */
  async getLateStatistics(month?: number, year?: number) {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const lateRequests = await this.prisma.attendance_requests.findMany({
      where: {
        work_date: {
          gte: startDate,
          lte: endDate,
        },
        request_type: 'LATE_EARLY',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
        late_early_request: true,
      },
    });

    // Thống kê theo loại
    const stats = {
      late_only: lateRequests.filter((r) => r.late_early_request?.request_type === 'LATE').length,
      early_only: lateRequests.filter((r) => r.late_early_request?.request_type === 'EARLY').length,
      both: lateRequests.filter((r) => r.late_early_request?.request_type === 'BOTH').length,
      total: lateRequests.length,
    };

    // Thống kê theo user
    const userStats = lateRequests.reduce((acc, request) => {
      const user_id = request.user_id;
      if (!acc[user_id]) {
        acc[user_id] = {
          user: request.user?.user_information?.name || '',
          late_count: 0,
          early_count: 0,
          both_count: 0,
          total: 0,
        };
      }

      if (request.late_early_request?.request_type === 'LATE') acc[user_id].late_count++;
      else if (request.late_early_request?.request_type === 'EARLY') acc[user_id].early_count++;
      else if (request.late_early_request?.request_type === 'BOTH') acc[user_id].both_count++;

      acc[user_id].total++;
      return acc;
    }, {});

    return {
      period: { month: targetMonth, year: targetYear },
      overall_stats: stats,
      user_stats: Object.values(userStats),
    };
  }

  /**
   * Báo cáo tổng hợp nghỉ phép
   */
  async getLeaveSummary(year?: number, division_id?: number) {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31);

    const where: any = {
      work_date: {
        gte: startDate,
        lte: endDate,
      },
      request_type: 'DAY_OFF',
    };

    if (division_id) {
      // Lấy user IDs từ user_role_assignment
      const assignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.DIVISION,
          scope_id: division_id,
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      const user_ids = assignments.map((a) => a.user_id);
      where.user_id = { in: user_ids };
    }

    const leaveRequests = await this.prisma.attendance_requests.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
        day_off: true,
      },
    });

    // Thống kê theo loại nghỉ phép
    const leaveTypeStats = leaveRequests.reduce((acc, leave) => {
      const type = leave.day_off?.type;
      if (!type) return acc;
      if (!acc[type]) {
        acc[type] = { count: 0, total_days: 0 };
      }
      acc[type].count += 1;
      acc[type].total_days += 1;
      return acc;
    }, {} as Record<string, { count: number; total_days: number }>);

    // Thống kê theo trạng thái
    const statusStats = leaveRequests.reduce((acc, leave) => {
      const status = leave.status;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status]++;
      return acc;
    }, {});

    // Thống kê theo user
    const userStats = leaveRequests.reduce((acc, leave) => {
      const user_id = leave.user_id;
      if (!acc[user_id]) {
        acc[user_id] = {
          user: leave.user.user_information?.name || '',
          total_requests: 0,
          total_days: 0,
          approved_days: 0,
          pending_days: 0,
        };
      }

      acc[user_id].total_requests++;
      acc[user_id].total_days += 1;

      if (leave.status === 'APPROVED') {
        acc[user_id].approved_days += 1;
      } else if (leave.status === 'PENDING') {
        acc[user_id].pending_days += 1;
      }

      return acc;
    }, {});

    return {
      year: targetYear,
      division_id: division_id,
      leave_type_stats: leaveTypeStats,
      status_stats: statusStats,
      user_stats: Object.values(userStats),
      total_requests: leaveRequests.length,
    };
  }

  /**
   * Báo cáo tổng hợp tăng ca
   */
  async getOvertimeSummary(
    startDate?: string,
    endDate?: string,
    division_id?: number,
  ) {
    const where: any = {
      request_type: 'OVERTIME',
    };

    if (startDate && endDate) {
      where.work_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (division_id) {
      // Lấy user IDs từ user_role_assignment
      const assignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.DIVISION,
          scope_id: division_id,
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      const user_ids = assignments.map((a) => a.user_id);
      where.user_id = { in: user_ids };
    }

    const overtimeRecords = await this.prisma.attendance_requests.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            user_information: { select: { name: true } },
            email: true,
          },
        },
        overtime: true,
        approved_by_user: { select: { id: true, email: true } },
      },
    });

    // Thống kê tổng hợp
    const totalStats = overtimeRecords.reduce(
      (acc, record) => {
        acc.total_records++;
        if (record.overtime?.start_time && record.overtime?.end_time) {
          const startMinutes = record.overtime.start_time.getHours() * 60 + record.overtime.start_time.getMinutes();
          const endMinutes = record.overtime.end_time.getHours() * 60 + record.overtime.end_time.getMinutes();
          acc.total_hours += (endMinutes - startMinutes) / 60;
        }
        acc.total_amount += 0;

        if (record.status === 'APPROVED') {
          acc.approved_records++;
          if (record.overtime?.start_time && record.overtime?.end_time) {
            const startMinutes = record.overtime.start_time.getHours() * 60 + record.overtime.start_time.getMinutes();
            const endMinutes = record.overtime.end_time.getHours() * 60 + record.overtime.end_time.getMinutes();
            acc.approved_hours += (endMinutes - startMinutes) / 60;
          }
          acc.approved_amount += 0;
        }

        return acc;
      },
      {
        total_records: 0,
        total_hours: 0,
        total_amount: 0,
        approved_records: 0,
        approved_hours: 0,
        approved_amount: 0,
      },
    );

    // Thống kê theo user
    const userStats = overtimeRecords.reduce((acc, record) => {
      const user_id = record.user_id;
      if (!acc[user_id]) {
        acc[user_id] = {
          user: record.user?.user_information?.name || '',
          total_sessions: 0,
          total_hours: 0,
          total_amount: 0,
          approved_sessions: 0,
          approved_hours: 0,
          approved_amount: 0,
        };
      }

      acc[user_id].total_sessions++;
      if (record.overtime?.start_time && record.overtime?.end_time) {
        const startMinutes = record.overtime.start_time.getHours() * 60 + record.overtime.start_time.getMinutes();
        const endMinutes = record.overtime.end_time.getHours() * 60 + record.overtime.end_time.getMinutes();
        acc[user_id].total_hours += (endMinutes - startMinutes) / 60;
      }
      acc[user_id].total_amount += 0;

      if (record.status === 'APPROVED') {
        acc[user_id].approved_sessions++;
        if (record.overtime?.start_time && record.overtime?.end_time) {
          const startMinutes = record.overtime.start_time.getHours() * 60 + record.overtime.start_time.getMinutes();
          const endMinutes = record.overtime.end_time.getHours() * 60 + record.overtime.end_time.getMinutes();
          acc[user_id].approved_hours += (endMinutes - startMinutes) / 60;
        }
        acc[user_id].approved_amount += 0;
      }

      return acc;
    }, {});

    // Thống kê theo dự án
    // REMOVED: Project stats (overtime no longer linked to projects)
    const projectStats = {}; /* overtimeRecords.reduce((acc, record) => {
      if (!record.project_id) return acc;

      const projectId = record.project_id;
      if (!acc[projectId]) {
        acc[projectId] = {
          project: record.project?.name || '',
          total_sessions: 0,
          total_hours: 0,
          total_amount: 0,
        };
      }

      acc[projectId].total_sessions++;
      acc[projectId].total_hours += record.total_hours || 0;
      acc[projectId].total_amount += record.total_amount || 0;

      return acc;
    }, {}); */

    return {
      period: { start_date: startDate, end_date: endDate },
      division_id: division_id,
      total_stats: totalStats,
      user_stats: Object.values(userStats),
      project_stats: Object.values(projectStats),
    };
  }

  async getPersonnelTransferSummary(year?: number, division_id?: number) {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31);

    const where: any = {
      date_rotation: {
        gte: startDate,
        lte: endDate,
      },
      deleted_at: null,
    };

    if (division_id) {
      where.OR = [
        { division_id: division_id },
        {
          user: {
            user_division: {
              some: {
                division_id: division_id,
              },
            },
          },
        },
      ];
    }

    const transfers = await this.prisma.rotation_members.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
        from_division: {
          select: { id: true, name: true },
        },
        to_division: {
          select: { id: true, name: true },
        },
      },
    });

    const typeStats = transfers.reduce((acc, transfer) => {
      const type = transfer.type;
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type]++;
      return acc;
    }, {});

    const monthlyStats = transfers.reduce((acc, transfer) => {
      const month = transfer.date_rotation.getMonth() + 1;
      if (!acc[month]) {
        acc[month] = 0;
      }
      acc[month]++;
      return acc;
    }, {});

    // Thống kê theo phòng ban đích
    const divisionStats = transfers.reduce((acc, transfer) => {
      const division_id = transfer.to_division.id;
      const divisionName = transfer.to_division.name || '';
      if (!acc[division_id]) {
        acc[division_id] = {
          division_name: divisionName,
          count: 0,
        };
      }
      acc[division_id].count++;
      return acc;
    }, {});

    return {
      year: targetYear,
      division_id: division_id,
      total_transfers: transfers.length,
      type_stats: typeStats,
      monthly_stats: monthlyStats,
      division_stats: Object.values(divisionStats),
      transfers: transfers.map((t) => ({
        id: t.id,
        user: t.user.user_information?.name || '',
        from_division: t.from_division.name,
        to_division: t.to_division.name,
        type: t.type,
        date_rotation: t.date_rotation.toISOString().split('T')[0],
      })),
    };
  }

  async getComprehensiveDashboard(month?: number, year?: number) {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const [
      attendanceCount,
      leaveCount,
      overtimeCount,
      transferCount,
      activeUsers,
      pendingRequests,
    ] = await Promise.all([
      this.prisma.attendance_logs.count({
        where: {
          created_at: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.attendance_requests.count({
        where: {
          created_at: { gte: startDate, lte: endDate },
          request_type: 'DAY_OFF',
        },
      }),
      this.prisma.attendance_requests.count({
        where: {
          work_date: { gte: startDate, lte: endDate },
          request_type: 'OVERTIME',
        },
      }),
      this.prisma.rotation_members.count({
        where: {
          date_rotation: { gte: startDate, lte: endDate },
          deleted_at: null,
        },
      }),
      this.prisma.users.count({
        where: {
          deleted_at: null,
        },
      }),
      this.prisma.attendance_requests.count({
        where: {
          deleted_at: null,
          status: ApprovalStatus.PENDING,
          request_type: AttendanceRequestType.REMOTE_WORK,
        },
      }),
    ]);

    return {
      period: { month: targetMonth, year: targetYear },
      summary: {
        attendance_records: attendanceCount,
        leave_requests: leaveCount,
        overtime_sessions: overtimeCount,
        personnel_transfers: transferCount,
        active_users: activeUsers,
        pending_requests: pendingRequests,
      },
      generated_at: new Date().toISOString(),
    };
  }
  
  private calculateWorkingDaysInMonth(
    startDate: string,
    endDate: string,
  ): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }

  /**
   * Nhóm thống kê chấm công theo chu kỳ (daily, weekly, monthly, yearly)
   */
  private groupAttendanceByPeriod(
    timesheets: any[],
    period_type: string,
  ): PeriodStats[] {
    const grouped: Record<string, Partial<PeriodStats>> = {};

    timesheets.forEach((timesheet) => {
      let key: string;
      const date = new Date(timesheet.work_date);

      switch (period_type) {
        case 'weekly': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          break;
        default: // daily
          key = date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          total_records: 0,
          total_work_hours: 0,
          average_work_hours: 0,
          total_late_count: 0,
          total_early_count: 0,
          attendance_rate: 0,
        };
      }

      const g = grouped[key];
      g.total_records = (g.total_records as number) + 1;
      g.total_work_hours =
        (g.total_work_hours as number) + (timesheet.total_work_time || 0) / 60;

      // REMOVED: Late/early tracking
    });

    return Object.values(grouped).sort((a, b) =>
      (a.period || '').localeCompare(b.period || ''),
    ) as PeriodStats[];
  }

  /**
   * Thống kê vi phạm theo user
   */
  private async getViolationStatistics(
    user_ids: number[],
    startDate: string,
    endDate: string,
  ) {
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    const whereViolation: TimesheetWhereInput = {
      work_date: {
        gte: startDateTime,
        lte: endDateTime,
      },
      deleted_at: null,
    };

    if (user_ids.length > 0) {
      whereViolation.user_id = { in: user_ids };
    }

    const violations = await this.prisma.time_sheets.findMany({
      where: whereViolation,
    });

    // Group by user_id - TYPE SAFE
    const userViolations: Record<number, Partial<ViolationStats>> = {};

    violations.forEach((violation) => {
      const user_id = violation.user_id;
      if (!userViolations[user_id]) {
        userViolations[user_id] = {
          user_id: user_id,
          user_name: undefined, // No user relation in time_sheets
          total_violations: 0,
          late_count: 0,
          early_leave_count: 0,
          total_penalties: 0,
          total_late_minutes: 0,
          total_early_minutes: 0,
        };
      }

      const uv = userViolations[user_id];
      uv.total_violations = (uv.total_violations || 0) + 1;

      // REMOVED: Late/early violation tracking - fields no longer exist
      uv.total_penalties = (uv.total_penalties || 0) + 0;
    });

    return Object.values(userViolations)
      .sort((a, b) => (b.total_penalties || 0) - (a.total_penalties || 0))
      .slice(0, 10) as ViolationStats[]; // Top 10
  }

  /**
   * Thống kê nghỉ phép
   */
  private async getLeaveStatistics(
    user_ids: number[],
    startDate: string,
    endDate: string,
  ) {
    const where: any = {
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      deleted_at: null,
      status: ApprovalStatus.APPROVED,
      request_type: 'DAY_OFF',
    };

    if (user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    const leaves = await this.prisma.attendance_requests.findMany({ 
      where,
      include: {
        day_off: true,
      },
    });

    const stats = {
      total_leave_days: leaves.reduce(
        (sum, leave) =>
          sum + (leave.day_off?.duration === DayOffDuration.FULL_DAY ? 1 : 0.5),
        0,
      ),
      paid_leave: leaves
        .filter((l) => l.day_off?.type === DayOffType.PAID)
        .reduce(
          (sum, leave) =>
            sum + (leave.day_off?.duration === DayOffDuration.FULL_DAY ? 1 : 0.5),
          0,
        ),
      unpaid_leave: leaves
        .filter((l) => l.day_off?.type === DayOffType.UNPAID)
        .reduce(
          (sum, leave) =>
            sum + (leave.day_off?.duration === DayOffDuration.FULL_DAY ? 1 : 0.5),
          0,
        ),
      annual_leave: leaves
        .filter((l) => l.day_off?.type === DayOffType.COMPENSATORY)
        .reduce(
          (sum, leave) =>
            sum + (leave.day_off?.duration === DayOffDuration.FULL_DAY ? 1 : 0.5),
          0,
        ),
      sick_leave: leaves
        .filter((l) => l.day_off?.type === DayOffType.SICK)
        .reduce(
          (sum, leave) =>
            sum + (leave.day_off?.duration === DayOffDuration.FULL_DAY ? 1 : 0.5),
          0,
        ),
      personal_leave: leaves
        .filter((l) => l.day_off?.type === DayOffType.PERSONAL)
        .reduce(
          (sum, leave) =>
            sum + (leave.day_off?.duration === DayOffDuration.FULL_DAY ? 1 : 0.5),
          0,
        ),
    };

    return stats;
  }

  /**
   * Tạo báo cáo tổng hợp
   */
  private generateSummaryReport(timesheets: any[], period: string) {
    const userStats: UserStatsMap = {};

    timesheets.forEach((timesheet) => {
      const user_id = timesheet.user_id;
      if (!userStats[user_id]) {
        userStats[user_id] = {
          user_id: user_id,
          total_days: 0,
          total_work_hours: 0,
          total_ot_hours: 0,
          total_late_minutes: 0,
          total_early_minutes: 0,
          on_time_days: 0,
          late_days: 0,
          early_leave_days: 0,
          remote_days: 0,
          total_penalties: 0,
        };
      }

      const us = userStats[user_id];
      us.total_days += 1;

      // REMOVED: Late/early tracking
      us.on_time_days! += 1;
      
      if (timesheet.remote === RemoteType.REMOTE) {
        us.remote_days! += 1;
      }

      const workHours = (timesheet.total_work_time || 0) / 60;
      us.total_work_hours += workHours;
      us.total_penalties! += 0;
    });

    return {
      report_type: 'summary',
      period,
      user_stats: Object.values(userStats),
      generated_at: new Date(),
    };
  }

  /**
   * Tạo báo cáo chi tiết
   */
  private generateDetailedReport(timesheets: any[], period: string) {
    return {
      report_type: 'detailed',
      period,
      records: timesheets.map((timesheet) => ({
        user_id: timesheet.user_id,
        date: timesheet.checkin.toISOString().split('T')[0],
        checkin: timesheet.checkin,
        checkout: timesheet.checkout,
        late_minutes: timesheet.late_time || 0,
        early_minutes: timesheet.early_time || 0,
        work_hours:
          ((timesheet.work_time_morning || 0) +
            (timesheet.work_time_afternoon || 0)) /
          60,
        penalties: 0,
        is_remote: timesheet.remote === RemoteType.REMOTE,
        status: timesheet.status,
      })),
      generated_at: new Date(),
    };
  }

  /**
   * Tạo báo cáo phạt
   */
  private generatePenaltyReport(timesheets: any[], period: string) {
    const penaltyRecords: any[] = [];

    const totalPenalties = 0;

    const penaltyByUser: Record<number, PenaltyByUser> = {};

    penaltyRecords.forEach((record) => {
      const user_id = record.user_id;
      if (!penaltyByUser[user_id]) {
        penaltyByUser[user_id] = {
          user_id: user_id,
          total_penalty: 0,
          late_penalty: 0,
          early_penalty: 0,
          violation_count: 0,
        };
      }

      penaltyByUser[user_id].total_penalty += 0;
      penaltyByUser[user_id].violation_count += 1;

      // Ước tính phân bổ phạt
      if (record.late_time > 0) penaltyByUser[user_id].late_penalty += 0;
      if (record.early_time > 0) penaltyByUser[user_id].early_penalty += 0;
    });

    return {
      report_type: 'penalty',
      period,
      total_penalties: totalPenalties,
      total_violations: penaltyRecords.length,
      penalty_by_user: Object.values(penaltyByUser),
      detailed_records: penaltyRecords.map((record) => ({
        user_id: record.user_id,
        date: record.checkin.toISOString().split('T')[0],
        late_minutes: record.late_time || 0,
        early_minutes: record.early_time || 0,
        penalty_amount: 0,
      })),
      generated_at: new Date(),
    };
  }
}
