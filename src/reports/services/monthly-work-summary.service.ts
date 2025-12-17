import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  AttendanceRequestType,
  DayOffDuration,
  DayOffType,
  Prisma,
  RemoteType,
  ScopeType,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  DailyAttendanceDto,
  LeaveDetailDto,
  LeaveSessionDto,
  MonthlyWorkSummaryDetailQueryDto,
  MonthlyWorkSummaryDetailResponseDto,
  MonthlyWorkSummaryDto,
  MonthlyWorkSummaryQueryDto,
  MonthlyWorkSummaryResponseDto,
  RecalculateMonthlyWorkDto,
  RecalculateResponseDto,
  ViolationDetailDto,
} from '../dto/monthly-work-summary.dto';

@Injectable()
export class MonthlyWorkSummaryService {
  private readonly logger = new Logger(MonthlyWorkSummaryService.name);

  // Configuration constants
  // NGHIỆP VỤ: 1 ngày = 1 CÔNG (không phải 2 công)
  private readonly MINIMUM_MORNING_MINUTES = 180; // 3 giờ tối thiểu buổi sáng
  private readonly MINIMUM_AFTERNOON_MINUTES = 180; // 3 giờ tối thiểu buổi chiều
  private readonly LATE_TOLERANCE_MINUTES = 15; // Đi muộn <= 15 phút không tính vi phạm
  private readonly EARLY_TOLERANCE_MINUTES = 15; // Về sớm <= 15 phút không tính vi phạm

  constructor(private prisma: PrismaService) {}

  async getMonthlyWorkSummary(
    query: MonthlyWorkSummaryQueryDto,
    currentUserId: number,
    userPermissions: string[],
  ): Promise<MonthlyWorkSummaryResponseDto> {
    this.logger.log(`Getting monthly work summary for month: ${query.month}`);

    const [year, month] = query.month.split('-').map(Number);
    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 1) {
      throw new BadRequestException(`Năm phải từ 2020 đến ${currentYear + 1}`);
    }

    const userIds = await this.getUserIdsForReport(
      currentUserId,
      userPermissions,
      query.division_id,
      query.team_id,
      query.user_ids,
      query.search,
    );

    if (userIds.length === 0) {
      return {
        data: [],
        pagination: {
          total: 0,
          page: query.page || 1,
          limit: query.limit || 20,
          total_pages: 0,
        },
        period: await this.getPeriodInfo(year, month),
        summary: {
          total_employees: 0,
          average_work_days: 0,
          average_attendance_rate: 0,
        },
      };
    }

    // Calculate monthly work summary for each user
    const allSummaries = await Promise.all(
      userIds.map((userId) =>
        this.calculateUserMonthlyWorkSummary(userId, year, month),
      ),
    );

    // Apply sorting
    const sortedSummaries = this.sortSummaries(
      allSummaries,
      query.sort_by || 'user_id',
      query.sort_order || 'asc',
    );

    // Apply pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;
    const paginatedData = sortedSummaries.slice(skip, skip + limit);

    // Calculate summary statistics
    const summary = this.calculateSummaryStatistics(allSummaries);

    return {
      data: paginatedData,
      pagination: {
        total: sortedSummaries.length,
        page,
        limit,
        total_pages: Math.ceil(sortedSummaries.length / limit),
      },
      period: await this.getPeriodInfo(year, month),
      summary,
    };
  }

  async getMonthlyWorkSummaryDetail(
    userId: number,
    query: MonthlyWorkSummaryDetailQueryDto,
  ): Promise<MonthlyWorkSummaryDetailResponseDto> {
    this.logger.log(
      `Getting detailed monthly work summary for user ${userId}, month: ${query.month}`,
    );

    const user = await this.prisma.users.findUnique({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${userId}`);
    }

    const [year, month] = query.month.split('-').map(Number);

    const summary = await this.calculateUserMonthlyWorkSummary(
      userId,
      year,
      month,
    );

    const dailyDetails = await this.getDailyAttendanceDetails(
      userId,
      year,
      month,
    );

    const violations = await this.getViolationDetails(userId, year, month);

    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        user_id: userId,
        work_date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
        deleted_at: null,
      },
      include: {
        attendance_requests: {
          select: {
            late_early_request: true,
            overtime: true,
            forgot_checkin_request: true,
            remote_work_request: true,
            day_off: true,
          },
        },
      },
    });

    const leaveDetails: LeaveDetailDto[] = timesheets.map((ts) => ({
      type:
        ts.attendance_requests
          .map((ar) => ar.day_off?.type)
          .find((t) => t !== undefined) || null,
    }));

    const overtimeDetails = timesheets.map((ts) => ({
      date: ts.work_date.toISOString().split('T')[0],
      overtime_hours:
        ts.attendance_requests
          .map((ar) => ar.overtime?.overtime_hours)
          .find((h) => h !== undefined) || 0,
    }));

    return {
      summary,
      daily_details: dailyDetails,
      violations,
      leave_details: leaveDetails,
      overtime_details: overtimeDetails,
    };
  }

  /**
   * Tính toán lại báo cáo công tháng
   */
  async recalculateMonthlyWork(
    dto: RecalculateMonthlyWorkDto,
  ): Promise<RecalculateResponseDto> {
    this.logger.log(`Recalculating monthly work for month: ${dto.month}`);

    const [year, month] = dto.month.split('-').map(Number);
    let userIds: number[];

    if (dto.user_ids && dto.user_ids.length > 0) {
      userIds = dto.user_ids;
    } else {
      // Get all active users
      const users = await this.prisma.users.findMany({
        where: { deleted_at: null },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    const errors: string[] = [];
    let recalculatedCount = 0;

    for (const userId of userIds) {
      try {
        await this.calculateUserMonthlyWorkSummary(userId, year, month);
        recalculatedCount++;
      } catch (error) {
        errors.push(`User ${userId}: ${error.message || 'Unknown error'}`);
        this.logger.error(`Error recalculating for user ${userId}:`, error);
      }
    }

    return {
      success: errors.length === 0,
      message:
        errors.length === 0
          ? 'Tính toán lại thành công'
          : `Tính toán lại hoàn tất với ${errors.length} lỗi`,
      recalculated_count: recalculatedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Tính toán báo cáo công tháng cho một nhân viên
   */
  private async calculateUserMonthlyWorkSummary(
    userId: number,
    year: number,
    month: number,
  ): Promise<MonthlyWorkSummaryDto> {
    // Get user info
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_information: {
          include: {
            position: true,
          },
        },
        user_role_assignments: {
          where: { deleted_at: null },
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Get division and team info
    const divisionAssignment = user.user_role_assignments.find(
      (a) => a.scope_type === ScopeType.DIVISION,
    );
    const teamAssignment = user.user_role_assignments.find(
      (a) => a.scope_type === ScopeType.TEAM,
    );

    let divisionName: string | undefined;
    let teamName: string | undefined;

    if (divisionAssignment?.scope_id) {
      const division = await this.prisma.divisions.findUnique({
        where: { id: divisionAssignment.scope_id },
      });
      divisionName = division?.name;
    }

    if (teamAssignment?.scope_id) {
      const team = await this.prisma.teams.findUnique({
        where: { id: teamAssignment.scope_id },
      });
      teamName = team?.name;
    }

    // Date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Calculate expected work days
    const expectedWorkDays = await this.calculateExpectedWorkDays(
      startDate,
      endDate,
    );

    // Get timesheets
    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        user_id: userId,
        work_date: {
          gte: startDate,
          lte: endDate,
        },
        deleted_at: null,
      },
      orderBy: { work_date: 'asc' },
    });

    // Get day offs
    const dayOffs = await this.prisma.day_offs.findMany({
      where: {
        user_id: userId,
        work_date: {
          gte: startDate,
          lte: endDate,
        },
        status: ApprovalStatus.APPROVED,
        deleted_at: null,
      },
      orderBy: { work_date: 'asc' },
    });

    // Get overtime
    const overtimes = await this.prisma.over_times_history.findMany({
      where: {
        user_id: userId,
        work_date: {
          gte: startDate,
          lte: endDate,
        },
        status: ApprovalStatus.APPROVED,
        deleted_at: null,
      },
    });

    // Calculate metrics
    const totalWorkDays = timesheets.filter(
      (t) => t.is_complete && t.status !== ApprovalStatus.REJECTED,
    ).length;

    const totalWorkHours = timesheets.reduce((sum, t) => {
      return sum + (t.total_work_time || 0) / 60;
    }, 0);

    // Leave days calculation
    const leaveDaysStats = this.calculateLeaveDays(dayOffs);

    // Violations calculation
    const violationsStats = this.calculateViolations(timesheets);

    // Remote work days
    const remoteWorkDays = timesheets.filter(
      (t) => t.remote === RemoteType.REMOTE,
    ).length;

    // Overtime
    const overtimeHours = overtimes.reduce(
      (sum, ot) => sum + (ot.total_hours || 0),
      0,
    );
    const overtimeDays = overtimes.length;

    // Working sessions calculation
    const workingSessionsStats = this.calculateWorkingSessions(
      timesheets,
      dayOffs,
      violationsStats,
    );

    // Absent days
    const absentDays = Math.max(
      0,
      expectedWorkDays - totalWorkDays - leaveDaysStats.totalLeaveDays,
    );

    // Rates
    const attendanceRate =
      expectedWorkDays > 0
        ? parseFloat(((totalWorkDays / expectedWorkDays) * 100).toFixed(2))
        : 0;

    const onTimeDays = totalWorkDays - violationsStats.lateCount;
    const onTimeRate =
      totalWorkDays > 0
        ? parseFloat(((onTimeDays / totalWorkDays) * 100).toFixed(2))
        : 100;

    // Leave sessions
    const leaveSessions: LeaveSessionDto[] = dayOffs.map((dayOff) => ({
      date: dayOff.work_date.toISOString().split('T')[0],
      duration: dayOff.duration,
      type: dayOff.type,
      status: dayOff.status,
      reason: dayOff.reason || undefined,
    }));

    return {
      user_id: userId,
      user_name: user.user_information?.name || '',
      user_email: user.email,
      user_code: user.user_information?.code || '',
      division_name: divisionName,
      team_name: teamName,
      position_name: user.user_information?.position?.name,
      total_work_days: totalWorkDays,
      expected_work_days: expectedWorkDays,
      total_work_hours: parseFloat(totalWorkHours.toFixed(2)),
      total_leave_days: leaveDaysStats.totalLeaveDays,
      paid_leave_days: leaveDaysStats.paidLeaveDays,
      unpaid_leave_days: leaveDaysStats.unpaidLeaveDays,
      sick_leave_days: leaveDaysStats.sickLeaveDays,
      other_leave_days: leaveDaysStats.otherLeaveDays,
      leave_sessions: leaveSessions,
      late_count: violationsStats.lateCount,
      early_leave_count: violationsStats.earlyLeaveCount,
      total_late_minutes: violationsStats.totalLateMinutes,
      total_early_minutes: violationsStats.totalEarlyMinutes,
      remote_work_days: remoteWorkDays,
      overtime_hours: parseFloat(overtimeHours.toFixed(2)),
      overtime_days: overtimeDays,
      absent_days: absentDays,
      attendance_rate: attendanceRate,
      on_time_rate: onTimeRate,
      total_working_sessions: workingSessionsStats.totalSessions,
      deducted_sessions: workingSessionsStats.deductedSessions,
      final_working_sessions: workingSessionsStats.finalSessions,
      is_complete: this.checkMonthComplete(timesheets, expectedWorkDays),
      locked_at: undefined,
    };
  }

  /**
   * Tính số ngày làm việc yêu cầu trong tháng (trừ weekend và holidays)
   */
  private async calculateExpectedWorkDays(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Get holidays in the period
    const holidays = await this.prisma.holidays.findMany({
      where: {
        status: 'ACTIVE',
        deleted_at: null,
        OR: [
          {
            AND: [
              { start_date: { lte: endDate } },
              { end_date: { gte: startDate } },
            ],
          },
        ],
      },
    });

    let workDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Check if it's a holiday
        const isHoliday = holidays.some((holiday) => {
          const holidayStart = new Date(holiday.start_date);
          const holidayEnd = new Date(holiday.end_date);
          return currentDate >= holidayStart && currentDate <= holidayEnd;
        });

        if (!isHoliday) {
          workDays++;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workDays;
  }

  private calculateLeaveDays(dayOffs: any[]) {
    let totalLeaveDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let sickLeaveDays = 0;
    let otherLeaveDays = 0;

    dayOffs.forEach((dayOff) => {
      const days = dayOff.duration === DayOffDuration.FULL_DAY ? 1 : 0.5;
      totalLeaveDays += days;

      if (dayOff.type === DayOffType.PAID) {
        paidLeaveDays += days;
      } else if (dayOff.type === DayOffType.UNPAID) {
        unpaidLeaveDays += days;
      } else if (
        dayOff.type === DayOffType.SICK ||
        dayOff.type === DayOffType.MATERNITY
      ) {
        sickLeaveDays += days;
      } else {
        otherLeaveDays += days;
      }
    });

    return {
      totalLeaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      sickLeaveDays,
      otherLeaveDays,
    };
  }

  /**
   * Tính số lần vi phạm và tổng phút
   */
  private calculateViolations(timesheets: any[]) {
    // REMOVED: Direct late/early time tracking from timesheets
    // Now violations are tracked via late_early_requests table only
    return {
      lateCount: 0,
      earlyLeaveCount: 0,
      totalLateMinutes: 0,
      totalEarlyMinutes: 0,
    };
  }

  /**
   * Tính số công làm việc
   * NGHIỆP VỤ: 1 ngày làm việc đủ = 1 CÔNG (không phải 2 công)
   *
   * XÉT CẢ APPROVED REQUESTS:
   * - late_time_approved: Đi muộn được duyệt → cộng vào morning
   * - early_time_approved: Về sớm được duyệt → cộng vào afternoon
   * - day_off (APPROVED): Nghỉ phép được duyệt → tính đủ
   */
  private calculateWorkingSessions(
    timesheets: any[],
    dayOffs: any[],
    violationsStats: any,
  ) {
    let totalSessions = 0;

    // 1 NGÀY = 1 CÔNG DUY NHẤT
    // Điều kiện: Phải làm đủ CẢ sáng VÀ chiều (hoặc có approved requests)
    timesheets.forEach((timesheet) => {
      // ✅ CỘNG approved time vào thời gian làm việc
      // REMOVED: Session-based tracking (work_time_morning/afternoon)
      // Now determine sessions from total_work_time and day_off duration
      const totalMinutes = timesheet.total_work_time || 0;
      const totalHours = totalMinutes / 60;

      // Simple logic: 8+ hours = full day, 4-8 hours = half day
      let morningOK = totalHours >= 4;
      let afternoonOK = totalHours >= 8;

      // ✅ CHECK nghỉ phép (day_off) được duyệt
      const dayOff = dayOffs.find((d) => {
        const timesheetDate = new Date(timesheet.work_date).getTime();
        const dayOffDate = new Date(d.work_date).getTime();
        return (
          dayOffDate === timesheetDate && d.status === ApprovalStatus.APPROVED
        );
      });

      if (dayOff) {
        // Nghỉ phép buổi sáng (approved) → tính đủ
        if (
          dayOff.duration === DayOffDuration.MORNING ||
          dayOff.duration === DayOffDuration.FULL_DAY
        ) {
          morningOK = true;
        }

        // Nghỉ phép buổi chiều (approved) → tính đủ
        if (
          dayOff.duration === DayOffDuration.AFTERNOON ||
          dayOff.duration === DayOffDuration.FULL_DAY
        ) {
          afternoonOK = true;
        }
      }

      // Tính công
      if (morningOK && afternoonOK) {
        totalSessions += 1; // Đủ cả 2 buổi = 1 công
      } else if (morningOK || afternoonOK) {
        totalSessions += 0.5; // Chỉ 1 buổi = 0.5 công
      }
      // Không đủ cả 2 buổi = 0 công
    });

    // Calculate deductions for severe violations (optional, based on company policy)
    const deductedSessions = 0;
    // For now, we don't deduct sessions for violations
    // This can be configured based on company policy

    const finalSessions = Math.max(0, totalSessions - deductedSessions);

    return {
      totalSessions,
      deductedSessions,
      finalSessions,
    };
  }

  /**
   * Check if month is complete (all days have been processed)
   */
  private checkMonthComplete(
    timesheets: any[],
    expectedWorkDays: number,
  ): boolean {
    const approvedOrPendingCount = timesheets.filter(
      (t) =>
        t.status === ApprovalStatus.APPROVED ||
        t.status === ApprovalStatus.PENDING,
    ).length;

    // Month is considered complete if we have records for most work days
    return approvedOrPendingCount >= expectedWorkDays * 0.9;
  }

  /**
   * Get period information
   */
  private async getPeriodInfo(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const totalWorkDays = await this.calculateExpectedWorkDays(
      startDate,
      endDate,
    );

    const holidays = await this.prisma.holidays.findMany({
      where: {
        status: 'ACTIVE',
        deleted_at: null,
        OR: [
          {
            AND: [
              { start_date: { lte: endDate } },
              { end_date: { gte: startDate } },
            ],
          },
        ],
      },
    });

    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      year,
      total_work_days: totalWorkDays,
      total_holidays: holidays.length,
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummaryStatistics(summaries: MonthlyWorkSummaryDto[]) {
    if (summaries.length === 0) {
      return {
        total_employees: 0,
        average_work_days: 0,
        average_attendance_rate: 0,
      };
    }

    const totalEmployees = summaries.length;
    const totalWorkDays = summaries.reduce(
      (sum, s) => sum + s.total_work_days,
      0,
    );
    const totalAttendanceRate = summaries.reduce(
      (sum, s) => sum + s.attendance_rate,
      0,
    );

    return {
      total_employees: totalEmployees,
      average_work_days: parseFloat(
        (totalWorkDays / totalEmployees).toFixed(2),
      ),
      average_attendance_rate: parseFloat(
        (totalAttendanceRate / totalEmployees).toFixed(2),
      ),
    };
  }

  /**
   * Sort summaries by field
   */
  private sortSummaries(
    summaries: MonthlyWorkSummaryDto[],
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): MonthlyWorkSummaryDto[] {
    return summaries.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'user_name':
          aValue = a.user_name.toLowerCase();
          bValue = b.user_name.toLowerCase();
          break;
        case 'attendance_rate':
          aValue = a.attendance_rate;
          bValue = b.attendance_rate;
          break;
        case 'total_work_days':
          aValue = a.total_work_days;
          bValue = b.total_work_days;
          break;
        case 'final_working_sessions':
          aValue = a.final_working_sessions;
          bValue = b.final_working_sessions;
          break;
        default:
          aValue = a.user_id;
          bValue = b.user_id;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private async getUserIdsForReport(
    currentUserId: number,
    userPermissions: string[],
    divisionId?: number,
    teamId?: number,
    userIdsParam?: string,
    search?: string,
  ): Promise<number[]> {
    const hasViewAll = userPermissions.includes(
      'reports.monthly-work-summary.view-all',
    );
    const hasViewTeam = userPermissions.includes(
      'reports.monthly-work-summary.view-team',
    );
    const hasViewOwn = userPermissions.includes(
      'reports.monthly-work-summary.view-own',
    );

    this.logger.debug(
      `[getUserIdsForReport] User ${currentUserId} permissions:`,
      {
        hasViewAll,
        hasViewTeam,
        hasViewOwn,
        allPermissions: userPermissions.filter((p) =>
          p.startsWith('reports.monthly'),
        ),
      },
    );

    if (!hasViewAll && !hasViewTeam && hasViewOwn) {
      this.logger.debug(
        `[getUserIdsForReport] User ${currentUserId} has ONLY view-own, returning [${currentUserId}]`,
      );
      return [currentUserId];
    }

    if (!hasViewAll && !hasViewTeam && !hasViewOwn) {
      this.logger.warn(
        `[getUserIdsForReport] User ${currentUserId} has NO report permissions`,
      );
      return [];
    }

    const where: Prisma.usersWhereInput = {
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        {
          email: {
            contains: search,
          },
        },
        {
          user_information: {
            name: {
              contains: search,
            },
          },
        },
      ];
    }

    if (userIdsParam) {
      const ids = userIdsParam.split(',').map((id) => parseInt(id.trim()));
      where.id = { in: ids };
    }

    let users = await this.prisma.users.findMany({
      where,
      select: {
        id: true,
        user_role_assignments: {
          where: { deleted_at: null },
          select: {
            scope_type: true,
            scope_id: true,
          },
        },
      },
    });

    console.log('user: ', users);

    // Filter by division/team if specified
    if (divisionId) {
      users = users.filter((u) =>
        u.user_role_assignments.some(
          (a) =>
            a.scope_type === ScopeType.DIVISION && a.scope_id === divisionId,
        ),
      );
    }

    if (teamId) {
      users = users.filter((u) =>
        u.user_role_assignments.some(
          (a) => a.scope_type === ScopeType.TEAM && a.scope_id === teamId,
        ),
      );
    }

    // Apply permission-based filtering
    if (!hasViewAll && hasViewTeam) {
      // Get current user's managed divisions/teams
      const currentUserAssignments =
        await this.prisma.user_role_assignment.findMany({
          where: {
            user_id: currentUserId,
            deleted_at: null,
            role: {
              name: { in: ['manager', 'team-lead', 'division-head'] },
            },
          },
        });

      const managedDivisions = currentUserAssignments
        .filter((a) => a.scope_type === ScopeType.DIVISION)
        .map((a) => a.scope_id);

      const managedTeams = currentUserAssignments
        .filter((a) => a.scope_type === ScopeType.TEAM)
        .map((a) => a.scope_id);

      // Filter users in managed divisions/teams
      users = users.filter((u) =>
        u.user_role_assignments.some(
          (a) =>
            (a.scope_type === ScopeType.DIVISION &&
              managedDivisions.includes(a.scope_id!)) ||
            (a.scope_type === ScopeType.TEAM &&
              managedTeams.includes(a.scope_id!)),
        ),
      );
    }

    return users.map((u) => u.id);
  }

  /**
   * Get daily attendance details
   */
  private async getDailyAttendanceDetails(
    userId: number,
    year: number,
    month: number,
  ): Promise<DailyAttendanceDto[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get timesheets
    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        user_id: userId,
        work_date: {
          gte: startDate,
          lte: endDate,
        },
        deleted_at: null,
      },
    });

    // Get day offs
    const dayOffs = await this.prisma.day_offs.findMany({
      where: {
        user_id: userId,
        work_date: {
          gte: startDate,
          lte: endDate,
        },
        status: ApprovalStatus.APPROVED,
        deleted_at: null,
      },
    });

    // Get holidays
    const holidays = await this.prisma.holidays.findMany({
      where: {
        status: 'ACTIVE',
        deleted_at: null,
        OR: [
          {
            AND: [
              { start_date: { lte: endDate } },
              { end_date: { gte: startDate } },
            ],
          },
        ],
      },
    });

    // Get requests
    const [
      remoteRequests,
      lateEarlyRequests,
      forgotCheckinRequests,
      overtimeRequests,
    ] = await Promise.all([
      this.prisma.remote_work_requests.findMany({
        where: {
          user_id: userId,
          work_date: { gte: startDate, lte: endDate },
          deleted_at: null,
        },
      }),
      this.prisma.late_early_requests.findMany({
        where: {
          user_id: userId,
          work_date: { gte: startDate, lte: endDate },
          deleted_at: null,
        },
      }),
      this.prisma.forgot_checkin_requests.findMany({
        where: {
          user_id: userId,
          work_date: { gte: startDate, lte: endDate },
          deleted_at: null,
        },
      }),
      this.prisma.over_times_history.findMany({
        where: {
          user_id: userId,
          work_date: { gte: startDate, lte: endDate },
          deleted_at: null,
        },
      }),
    ]);

    const dailyDetails: DailyAttendanceDto[] = [];
    const currentDate = new Date(startDate);
    const dayNames = [
      'Chủ nhật',
      'Thứ 2',
      'Thứ 3',
      'Thứ 4',
      'Thứ 5',
      'Thứ 6',
      'Thứ 7',
    ];

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const timesheet = timesheets.find(
        (t) => t.work_date.toISOString().split('T')[0] === dateStr,
      );

      const dayOff = dayOffs.find(
        (d) => d.work_date.toISOString().split('T')[0] === dateStr,
      );

      const holiday = holidays.find((h) => {
        const holidayStart = new Date(h.start_date);
        const holidayEnd = new Date(h.end_date);
        return currentDate >= holidayStart && currentDate <= holidayEnd;
      });

      const hasRemoteRequest = remoteRequests.some(
        (r) => r.work_date.toISOString().split('T')[0] === dateStr,
      );
      const hasLateEarlyRequest = lateEarlyRequests.some(
        (r) => r.work_date.toISOString().split('T')[0] === dateStr,
      );
      const hasForgotCheckinRequest = forgotCheckinRequests.some(
        (r) => r.work_date.toISOString().split('T')[0] === dateStr,
      );
      const hasOvertimeRequest = overtimeRequests.some(
        (r) => r.work_date.toISOString().split('T')[0] === dateStr,
      );

      let status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'WEEKEND';
      if (isWeekend) {
        status = 'WEEKEND';
      } else if (holiday) {
        status = 'HOLIDAY';
      } else if (dayOff) {
        status = 'LEAVE';
      } else if (timesheet) {
        status = 'PRESENT';
      } else {
        status = 'ABSENT';
      }

      // REMOVED: Session-based calculations
      const workHours = timesheet ? (timesheet.total_work_time || 0) / 60 : 0;
      const morningSessions = 0;
      const afternoonSessions = 0;

      dailyDetails.push({
        date: dateStr,
        day_of_week: dayNames[dayOfWeek],
        is_holiday: !!holiday,
        holiday_name: holiday?.name,
        checkin_time: timesheet?.checkin
          ? new Date(timesheet.checkin).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,
        checkout_time: timesheet?.checkout
          ? new Date(timesheet.checkout).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,
        work_hours: parseFloat(workHours.toFixed(2)),
        late_minutes: 0, // REMOVED
        early_minutes: 0, // REMOVED
        status,
        remote_type: timesheet?.remote || 'OFFICE',
        has_leave_request: !!dayOff,
        has_overtime_request: hasOvertimeRequest,
        has_late_early_request: hasLateEarlyRequest,
        has_forgot_checkin_request: hasForgotCheckinRequest,
        morning_session: morningSessions,
        afternoon_session: afternoonSessions,
        total_sessions: morningSessions + afternoonSessions,
        notes: undefined, // REMOVED: checkin_checkout
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyDetails;
  }

  private async getViolationDetails(
    userId: number,
    year: number,
    month: number,
  ): Promise<ViolationDetailDto[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        user_id: userId,
        work_date: {
          gte: startDate,
          lte: endDate,
        },
        deleted_at: null,
        id: { gt: 0 },
      },
      select: {
        attendance_requests: {
          where: {
            status: ApprovalStatus.APPROVED,
            request_type: AttendanceRequestType.LATE_EARLY,
          }
        },
      },
    });

    const violations: ViolationDetailDto[] = [];

    timesheets.forEach((timesheet) => {
      const dateStr = timesheet.work_date.toISOString().split('T')[0];
      const lateMinutes = 0;
      const earlyMinutes = 0;

      const hasApprovedRequest = lateEarlyRequests.some(
        (r) => r.work_date.toISOString().split('T')[0] === dateStr,
      );

      if (
        lateMinutes > this.LATE_TOLERANCE_MINUTES ||
        earlyMinutes > this.EARLY_TOLERANCE_MINUTES
      ) {
        let type: 'LATE' | 'EARLY' | 'BOTH';
        if (
          lateMinutes > this.LATE_TOLERANCE_MINUTES &&
          earlyMinutes > this.EARLY_TOLERANCE_MINUTES
        ) {
          type = 'BOTH';
        } else if (lateMinutes > this.LATE_TOLERANCE_MINUTES) {
          type = 'LATE';
        } else {
          type = 'EARLY';
        }

        violations.push({
          date: dateStr,
          type,
          late_minutes: lateMinutes,
          early_minutes: earlyMinutes,
          has_approved_request: hasApprovedRequest,
          reason: undefined,
        });
      }
    });

    return violations;
  }
}
