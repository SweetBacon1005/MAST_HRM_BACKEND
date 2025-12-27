import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DayOffType,
  RemoteType,
  ApprovalStatus,
  ScopeType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AttendanceDashboardDto,
  AttendanceReportDto,
} from './dto/dashboard.dto';
import {
  LeaveBalanceDto,
} from './dto/leave-management.dto';
@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
  ) {}


  async getLeaveBalance(
    user_id: number,
    year: number,
  ): Promise<LeaveBalanceDto> {
    const user = await this.prisma.users.findUnique({
      where: { id: user_id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với ID: ${user_id}`,
      );
    }

    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 1) {
      throw new BadRequestException(`Năm phải từ 2020 đến ${currentYear + 1}`);
    }

    const total_annual_leave = 12;

    const used_leaves_requests = await this.prisma.attendance_requests.findMany({
      where: {
      user_id,
      request_type: 'DAY_OFF',
        status: ApprovalStatus.APPROVED,
      deleted_at: null,
      created_at: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
      include: {
        day_off: true,
      },
    });
    const used_leaves = used_leaves_requests.map(r => r.day_off).filter((d): d is NonNullable<typeof d> => d !== null && d !== undefined);

    const used_annual_leave = used_leaves.reduce(
      (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
      0,
    );

    const sick_leaves_requests = await this.prisma.attendance_requests.findMany({
      where: {
      user_id,
      request_type: 'DAY_OFF',
        status: ApprovalStatus.APPROVED,
      deleted_at: null,
      created_at: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
      include: {
        day_off: true,
      },
    });
    const sick_leaves = sick_leaves_requests.map(r => r.day_off).filter((d): d is NonNullable<typeof d> => d !== null && d !== undefined && d.type === 'SICK');

    const used_sick_leave = sick_leaves.reduce(
      (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
      0,
    );

    return {
      user_id,
      year,
      total_annual_leave,
      used_annual_leave,
      remaining_annual_leave: total_annual_leave - used_annual_leave,
      compensatory_leave: 0, // Có thể tính từ làm thêm giờ
      used_sick_leave,
    };
  }

    async getAttendanceDashboard(dashboardDto: AttendanceDashboardDto) {
    const { start_date, end_date, division_id, team_id, period_type } =
      dashboardDto;

    const startDate =
      start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

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

    const where: any = {
      checkin: {
        gte: startDateTime,
        lte: endDateTime,
      },
      deleted_at: null,
    };

    if (user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    const timesheets = await this.prisma.time_sheets.findMany({ where });

    const totalRecords = timesheets.length;
    // REMOVED: Late/early tracking - use late_early_requests table instead
    const onTimeRecords = timesheets.length;  // All records now
    const lateRecords = 0;
    const earlyLeaveRecords = 0;
    const remoteRecords = timesheets.filter(
      (t) => t.remote === 'REMOTE',
    ).length;
    const totalPenalties = 0;

    const dailyStats = this.groupAttendanceByPeriod(
      timesheets,
      period_type || 'daily',
    );

    const violationStats = await this.getViolationStatistics(
      user_ids,
      startDate,
      endDate,
    );

    const leaveStats = await this.getLeaveStatistics(
      user_ids,
      startDate,
      endDate,
    );

    const requestsStats = await this.getRequestsStatistics(
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
      requests_stats: requestsStats,
      period: { start_date: startDate, end_date: endDate },
    };
  }

  private groupAttendanceByPeriod(timesheets: any[], period_type: string) {
    const grouped: { [key: string]: any } = {};

    timesheets.forEach((timesheet) => {
      let key: string;
      const date = new Date(timesheet.checkin);

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
          total: 0,
          on_time: 0,
          late: 0,
          early_leave: 0,
          remote: 0,
          total_penalties: 0,
        };
      }

      grouped[key].total += 1;
      // REMOVED: Late/early tracking from timesheet
      grouped[key].on_time += 1;
      grouped[key].late += 0;
      grouped[key].early_leave += 0;
      if (timesheet.remote === 1) grouped[key].remote += 1;
      grouped[key].total_penalties += 0;
    });

    return Object.values(grouped).sort((a: any, b: any) =>
      a.period.localeCompare(b.period),
    );
  }

  private async getViolationStatistics(
    user_ids: number[],
    startDate: string,
    endDate: string,
  ) {
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    const where: any = {
      checkin: {
        gte: startDateTime,
        lte: endDateTime,
      },
      deleted_at: null,
    };

    if (user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    // REMOVED: Violation tracking from timesheets - use late_early_requests table
    const violations = await this.prisma.time_sheets.findMany({
      where: {
        ...where,
        id: { gt: 0 },  // Dummy condition since OR removed
      },
    });

    const userViolations: { [key: number]: any } = {};

    violations.forEach((violation) => {
      const user_id = violation.user_id;
      if (!userViolations[user_id]) {
        userViolations[user_id] = {
          user_id: user_id,
          total_violations: 0,
          late_count: 0,
          early_leave_count: 0,
          total_penalties: 0,
          total_late_minutes: 0,
          total_early_minutes: 0,
        };
      }

      // REMOVED: Late/early time tracking - fields no longer exist
      userViolations[user_id].total_violations += 0;
      userViolations[user_id].total_penalties += 0;
    });

    return Object.values(userViolations)
      .sort((a: any, b: any) => b.total_penalties - a.total_penalties)
      .slice(0, 10); // Top 10
  }

  private async getRequestsStatistics(
    user_ids: number[],
    startDate: string,
    endDate: string,
  ) {
    const baseWhere: any = {
      created_at: { gte: new Date(startDate), lte: new Date(endDate) },
      deleted_at: null,
    };
    if (user_ids.length > 0) {
      baseWhere.user_id = { in: user_ids };
    }

    const [leaveRequests, remoteWorkRequests, lateEarlyRequests, forgotCheckinRequests] = await Promise.all([
      this.prisma.attendance_requests.findMany({
        where: { ...baseWhere, request_type: 'DAY_OFF' },
      }),
      this.prisma.attendance_requests.findMany({
        where: { ...baseWhere, request_type: 'REMOTE_WORK' },
      }),
      this.prisma.attendance_requests.findMany({
        where: { ...baseWhere, request_type: 'LATE_EARLY' },
      }),
      this.prisma.attendance_requests.findMany({
        where: { ...baseWhere, request_type: 'FORGOT_CHECKIN' },
      }),
    ]);

    const countByStatus = (requests: any[]) => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === ApprovalStatus.PENDING).length,
      approved: requests.filter((r) => r.status === ApprovalStatus.APPROVED).length,
      rejected: requests.filter((r) => r.status === ApprovalStatus.REJECTED).length,
    });

    return {
      leave_requests: countByStatus(leaveRequests),
      remote_work_requests: countByStatus(remoteWorkRequests),
      late_early_requests: countByStatus(lateEarlyRequests),
      forgot_checkin_requests: countByStatus(forgotCheckinRequests),
      total_requests: 
        leaveRequests.length + 
        remoteWorkRequests.length + 
        lateEarlyRequests.length + 
        forgotCheckinRequests.length,
    };
  }

  private async getLeaveStatistics(
    user_ids: number[],
    startDate: string,
    endDate: string,
  ) {
    const where: any = {
      created_at: { gte: new Date(startDate), lte: new Date(endDate) },
      deleted_at: null,
      status: ApprovalStatus.APPROVED,
      request_type: 'DAY_OFF',
    };
    if (user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    const leaveRequests = await this.prisma.attendance_requests.findMany({
      where,
      include: {
        day_off: true,
      },
    });
    const leaves = leaveRequests.map(r => r.day_off).filter((d): d is NonNullable<typeof d> => d !== null && d !== undefined);

    const stats = {
      total_leave_days: leaves.reduce(
        (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
        0,
      ),
      paid_leave: leaves
        .filter((l) => l.type === DayOffType.PAID)
        .reduce(
          (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
          0,
        ),
      unpaid_leave: leaves
        .filter((l) => l.type === DayOffType.UNPAID)
        .reduce(
          (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
          0,
        ),
      annual_leave: leaves
        .filter((l) => l.type === DayOffType.COMPENSATORY)
        .reduce(
          (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
          0,
        ),
      sick_leave: leaves
        .filter((l) => l.type === DayOffType.SICK)
        .reduce(
          (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
          0,
        ),
      personal_leave: leaves
        .filter((l) => l.type === DayOffType.PERSONAL)
        .reduce(
          (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
          0,
        ),
    };

    return stats;
  }

  async generateAttendanceReport(reportDto: AttendanceReportDto) {
    const { month, year, user_ids, report_type } = reportDto;

    const currentDate = new Date();
    const reportYear = year || currentDate.getFullYear();
    const reportMonth =
      month ||
      `${reportYear}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const startDate = new Date(`${reportMonth}-01`);
    const endDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
    );

    const where: any = {
      checkin: {
        gte: startDate,
        lte: endDate,
      },
      deleted_at: null,
    };

    if (user_ids && user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    const timesheets = await this.prisma.time_sheets.findMany({
      where,
      orderBy: [{ user_id: 'asc' }, { checkin: 'asc' }],
    });

    switch (report_type) {
      case 'summary':
        return this.generateSummaryReport(timesheets, reportMonth);
      case 'detailed':
        return this.generateDetailedReport(timesheets, reportMonth);
      case 'penalty':
        return this.generatePenaltyReport(timesheets, reportMonth);
      default:
        return this.generateSummaryReport(timesheets, reportMonth);
    }
  }

  private generateSummaryReport(timesheets: any[], period: string) {
    const userStats: { [key: number]: any } = {};

    timesheets.forEach((timesheet) => {
      const user_id = timesheet.user_id;
      if (!userStats[user_id]) {
        userStats[user_id] = {
          user_id: user_id,
          total_days: 0,
          on_time_days: 0,
          late_days: 0,
          early_leave_days: 0,
          remote_days: 0,
          total_work_hours: 0,
          total_late_minutes: 0,
          total_early_minutes: 0,
          total_penalties: 0,
        };
      }

      userStats[user_id].total_days += 1;
      // REMOVED: late_time, early_time fields no longer exist
        userStats[user_id].on_time_days += 1;
      userStats[user_id].late_days += 0;
      userStats[user_id].total_late_minutes += 0;
      userStats[user_id].early_leave_days += 0;
      userStats[user_id].total_early_minutes += 0;
      if (timesheet.remote === RemoteType.REMOTE)
        userStats[user_id].remote_days += 1;

      // REMOVED: work_time_morning, work_time_afternoon - use total_work_time
      const workHours = (timesheet.total_work_time || 0) / 60;
      userStats[user_id].total_work_hours += workHours;
      userStats[user_id].total_penalties += 0;
    });

    return {
      report_type: 'summary',
      period,
      user_stats: Object.values(userStats),
      generated_at: new Date(),
    };
  }

  private generateDetailedReport(timesheets: any[], period: string) {
    return {
      report_type: 'detailed',
      period,
      records: timesheets.map((timesheet) => ({
        user_id: timesheet.user_id,
        date: timesheet.checkin?.toISOString().split('T')[0] || timesheet.work_date?.toISOString().split('T')[0] || '',
        checkin: timesheet.checkin,
        checkout: timesheet.checkout,
        late_minutes: 0, // REMOVED: late_time field no longer exists
        early_minutes: 0, // REMOVED: early_time field no longer exists
        work_hours: (timesheet.total_work_time || 0) / 60, // REMOVED: work_time_morning/afternoon
        penalties: 0,
        is_remote: timesheet.remote === RemoteType.REMOTE,
      })),
      generated_at: new Date(),
    };
  }

  private generatePenaltyReport(timesheets: any[], period: string) {
    const penaltyRecords: any[] = [];

    const totalPenalties = 0;
    const penaltyByUser: { [key: number]: any } = {};

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
        date: record.checkin?.toISOString().split('T')[0] || '',
        late_minutes: 0, // REMOVED: late_time field no longer exists
        early_minutes: 0, // REMOVED: early_time field no longer exists
        penalty_amount: 0,
      })),
      generated_at: new Date(),
    };
  }
}
