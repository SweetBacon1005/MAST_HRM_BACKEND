import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  AttendanceCalculationDto,
  PenaltyCalculationDto,
  WorkShiftDto,
} from './dto/attendance-calculation.dto';
import {
  AttendanceDashboardDto,
  AttendanceReportDto,
} from './dto/dashboard.dto';
import {
  CreateLeaveRequestDto,
  LeaveBalanceDto,
  RemoteWorkRequestDto,
} from './dto/leave-management.dto';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import {
  WorkShiftPaginationDto,
  LeaveRequestPaginationDto,
  AttendanceReportPaginationDto,
  PenaltyRulePaginationDto,
} from './dto/pagination-queries.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // === TÍNH TOÁN THỜI GIAN CHI TIẾT ===

  async calculateAttendance(attendanceDto: AttendanceCalculationDto) {
    const {
      user_id,
      checkin_time,
      checkout_time,
      shift_id,
      is_remote,
      note: _note,
    } = attendanceDto;

    const checkin = new Date(checkin_time);
    const checkout = new Date(checkout_time);
    const workDate = checkin.toISOString().split('T')[0];

    // Lấy thông tin ca làm việc
    let workShift;
    if (shift_id) {
      workShift = await this.prisma.schedule_works.findUnique({
        where: { id: shift_id },
      });
    } else {
      // Lấy ca làm việc mặc định
      workShift = await this.prisma.schedule_works.findFirst({
        where: {
          start_date: { lte: new Date(workDate) },
          end_date: { gte: new Date(workDate) },
          type: 1, // Ca thường
        },
      });
    }

    if (!workShift) {
      throw new NotFoundException('Không tìm thấy ca làm việc phù hợp');
    }

    // Tính toán thời gian làm việc
    const calculations = this.calculateWorkingTime(
      checkin,
      checkout,
      workShift,
    );

    // Tính phạt
    const penalties = await this.calculatePenalties({
      late_minutes: calculations.late_minutes,
      early_minutes: calculations.early_minutes,
    });

    // Kiểm tra xem đã có bản ghi chấm công hôm nay chưa
    const existingAttendance = await this.prisma.time_sheets.findFirst({
      where: {
        user_id,
        checkin: {
          gte: new Date(workDate + 'T00:00:00.000Z'),
          lt: new Date(workDate + 'T23:59:59.999Z'),
        },
        deleted_at: null,
      },
    });

    const attendanceData = {
      user_id,
      checkin,
      checkout,
      checkin_checkout: `${checkin_time} - ${checkout_time}`,
      late_time: calculations.late_minutes,
      early_time: calculations.early_minutes,
      work_time_morning: calculations.morning_minutes,
      work_time_afternoon: calculations.afternoon_minutes,
      fines: penalties.total_penalty,
      remote: is_remote ? 1 : 0,
      is_complete: 1,
      status: 1, // Chờ duyệt
      type: workShift.type || 1,
    };

    if (existingAttendance) {
      // Cập nhật bản ghi hiện tại
      return this.prisma.time_sheets.update({
        where: { id: existingAttendance.id },
        data: attendanceData,
      });
    } else {
      // Tạo bản ghi mới
      return this.prisma.time_sheets.create({
        data: attendanceData,
      });
    }
  }

  private calculateWorkingTime(checkin: Date, checkout: Date, workShift: any) {
    const morningStart = new Date(workShift.hour_start_morning);
    const morningEnd = new Date(workShift.hour_end_morning);
    const afternoonStart = new Date(workShift.hour_start_afternoon);
    const afternoonEnd = new Date(workShift.hour_end_afternoon);

    // Set same date for comparison
    const _workDate = checkin.toISOString().split('T')[0];
    morningStart.setFullYear(
      checkin.getFullYear(),
      checkin.getMonth(),
      checkin.getDate(),
    );
    morningEnd.setFullYear(
      checkin.getFullYear(),
      checkin.getMonth(),
      checkin.getDate(),
    );
    afternoonStart.setFullYear(
      checkin.getFullYear(),
      checkin.getMonth(),
      checkin.getDate(),
    );
    afternoonEnd.setFullYear(
      checkin.getFullYear(),
      checkin.getMonth(),
      checkin.getDate(),
    );

    // Tính đi muộn
    const late_minutes =
      checkin > morningStart
        ? Math.floor((checkin.getTime() - morningStart.getTime()) / (1000 * 60))
        : 0;

    // Tính về sớm
    const early_minutes =
      checkout < afternoonEnd
        ? Math.floor(
            (afternoonEnd.getTime() - checkout.getTime()) / (1000 * 60),
          )
        : 0;

    // Tính thời gian làm việc buổi sáng
    const actualMorningStart = checkin > morningStart ? checkin : morningStart;
    const actualMorningEnd = checkout < morningEnd ? checkout : morningEnd;
    const morning_minutes =
      actualMorningEnd > actualMorningStart
        ? Math.floor(
            (actualMorningEnd.getTime() - actualMorningStart.getTime()) /
              (1000 * 60),
          )
        : 0;

    // Tính thời gian làm việc buổi chiều
    const actualAfternoonStart =
      checkin > afternoonStart ? checkin : afternoonStart;
    const actualAfternoonEnd =
      checkout < afternoonEnd ? checkout : afternoonEnd;
    const afternoon_minutes =
      actualAfternoonEnd > actualAfternoonStart
        ? Math.floor(
            (actualAfternoonEnd.getTime() - actualAfternoonStart.getTime()) /
              (1000 * 60),
          )
        : 0;

    return {
      late_minutes: Math.max(0, late_minutes),
      early_minutes: Math.max(0, early_minutes),
      morning_minutes: Math.max(0, morning_minutes),
      afternoon_minutes: Math.max(0, afternoon_minutes),
      total_work_minutes: morning_minutes + afternoon_minutes,
    };
  }

  async calculatePenalties(penaltyDto: PenaltyCalculationDto) {
    const { late_minutes, early_minutes, block_time_id } = penaltyDto;

    // Lấy quy định phạt
    let blockTime;
    if (block_time_id) {
      blockTime = await this.prisma.block_times.findUnique({
        where: { id: block_time_id },
      });
    } else {
      // Lấy quy định phạt mặc định
      blockTime = await this.prisma.block_times.findFirst({
        where: { deleted_at: null },
        orderBy: { block: 'asc' },
      });
    }

    if (!blockTime) {
      return { late_penalty: 0, early_penalty: 0, total_penalty: 0 };
    }

    // Tính phạt đi muộn
    const late_blocks = Math.floor(late_minutes / blockTime.minutes);
    const late_penalty = late_blocks * blockTime.money;

    // Tính phạt về sớm
    const early_blocks = Math.floor(early_minutes / blockTime.minutes);
    const early_penalty = early_blocks * blockTime.money;

    return {
      late_penalty,
      early_penalty,
      total_penalty: late_penalty + early_penalty,
      late_blocks,
      early_blocks,
      block_time_used: blockTime,
    };
  }

  // === QUẢN LÝ CA LÀM VIỆC ===

  async createWorkShift(workShiftDto: WorkShiftDto) {
    return this.prisma.schedule_works.create({
      data: {
        name: workShiftDto.name,
        hour_start_morning: new Date(workShiftDto.morning_start),
        hour_end_morning: new Date(workShiftDto.morning_end),
        hour_start_afternoon: new Date(workShiftDto.afternoon_start),
        hour_end_afternoon: new Date(workShiftDto.afternoon_end),
        type: workShiftDto.type || 1,
        start_date: new Date(),
        end_date: new Date(new Date().getFullYear() + 1, 11, 31), // Hết năm
      },
    });
  }

  async getAllWorkShifts() {
    return this.prisma.schedule_works.findMany({
      where: { deleted_at: null },
      orderBy: { type: 'asc' },
    });
  }

  async getAllWorkShiftsPaginated(paginationDto: WorkShiftPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = { deleted_at: null };

    // Thêm filter theo shift_name
    if (paginationDto.shift_name) {
      where.name = {
        contains: paginationDto.shift_name,
        mode: 'insensitive',
      };
    }

    // Thêm filter theo status
    if (paginationDto.status) {
      where.status = paginationDto.status;
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.schedule_works.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { type: 'asc' },
      }),
      this.prisma.schedule_works.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async updateWorkShift(id: number, workShiftDto: Partial<WorkShiftDto>) {
    const workShift = await this.prisma.schedule_works.findUnique({
      where: { id },
    });

    if (!workShift) {
      throw new NotFoundException('Không tìm thấy ca làm việc');
    }

    return this.prisma.schedule_works.update({
      where: { id },
      data: {
        ...workShiftDto,
        hour_start_morning: workShiftDto.morning_start
          ? new Date(workShiftDto.morning_start)
          : undefined,
        hour_end_morning: workShiftDto.morning_end
          ? new Date(workShiftDto.morning_end)
          : undefined,
        hour_start_afternoon: workShiftDto.afternoon_start
          ? new Date(workShiftDto.afternoon_start)
          : undefined,
        hour_end_afternoon: workShiftDto.afternoon_end
          ? new Date(workShiftDto.afternoon_end)
          : undefined,
      },
    });
  }

  // === QUẢN LÝ NGHỈ PHÉP NÂNG CAO ===

  async createLeaveRequest(leaveRequestDto: CreateLeaveRequestDto) {
    const {
      user_id,
      leave_type,
      start_date,
      end_date,
      total_days,
      reason: _reason,
      is_half_day: _is_half_day,
      half_day_period: _half_day_period,
      attachment_url: _attachment_url,
      note: _note,
    } = leaveRequestDto;

    // Kiểm tra số dư phép năm nếu là phép năm
    if (leave_type === 3) {
      const leaveBalance = await this.getLeaveBalance(
        user_id,
        new Date().getFullYear(),
      );
      if (leaveBalance.remaining_annual_leave < total_days) {
        throw new BadRequestException('Số ngày phép năm không đủ');
      }
    }

    // Kiểm tra trùng lịch nghỉ
    const conflictingLeave = await this.prisma.day_offs.findFirst({
      where: {
        user_id,
        status: { in: [1, 2] }, // Chờ duyệt hoặc đã duyệt
        deleted_at: null,
        OR: [
          {
            AND: [
              { created_at: { gte: new Date(start_date) } },
              { created_at: { lte: new Date(end_date) } },
            ],
          },
        ],
      },
    });

    if (conflictingLeave) {
      throw new BadRequestException(
        'Đã có đơn nghỉ phép trong khoảng thời gian này',
      );
    }

    return this.prisma.day_offs.create({
      data: {
        user_id,
        total: total_days,
        status: 1, // Chờ duyệt
        type: leave_type,
        is_past: 0,
        start_date,
        end_date,
        // Lưu thông tin bổ sung vào các trường có sẵn hoặc tạo bảng mới nếu cần
      },
    });
  }

  async createRemoteWorkRequest(remoteWorkDto: RemoteWorkRequestDto) {
    const {
      user_id,
      work_date,
      reason: _reason,
      location: _location,
      is_full_day,
      start_time,
      end_time,
    } = remoteWorkDto;

    // Kiểm tra xem đã có yêu cầu remote work cho ngày này chưa
    const existingRequest = await this.prisma.time_sheets.findFirst({
      where: {
        user_id,
        checkin: {
          gte: new Date(work_date + 'T00:00:00.000Z'),
          lt: new Date(work_date + 'T23:59:59.999Z'),
        },
        remote: 1,
        deleted_at: null,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Đã có yêu cầu làm việc từ xa cho ngày này',
      );
    }

    // Tạo bản ghi timesheet cho remote work
    const checkin = is_full_day
      ? new Date(work_date + 'T08:00:00.000Z')
      : new Date(start_time!);
    const checkout = is_full_day
      ? new Date(work_date + 'T17:30:00.000Z')
      : new Date(end_time!);

    return this.prisma.time_sheets.create({
      data: {
        user_id,
        checkin,
        checkout,
        remote: 1,
        status: 1, // Chờ duyệt
        is_complete: 1,
        request_type: 1, // Remote work request
        work_time_morning: is_full_day
          ? 240
          : Math.floor((checkout.getTime() - checkin.getTime()) / (1000 * 60)),
        work_time_afternoon: is_full_day ? 240 : 0,
      },
    });
  }

  async getLeaveBalance(
    user_id: number,
    year: number,
  ): Promise<LeaveBalanceDto> {
    // Lấy tổng số ngày phép trong năm (mặc định 12 ngày)
    const total_annual_leave = 12;

    // Tính số ngày phép đã sử dụng
    const used_leaves = await this.prisma.day_offs.findMany({
      where: {
        user_id,
        type: 3, // Phép năm
        status: 2, // Đã duyệt
        deleted_at: null,
        created_at: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const used_annual_leave = used_leaves.reduce(
      (sum, leave) => sum + leave.total,
      0,
    );

    // Tính số ngày nghỉ ốm đã sử dụng
    const sick_leaves = await this.prisma.day_offs.findMany({
      where: {
        user_id,
        type: 4, // Nghỉ ốm
        status: 2, // Đã duyệt
        deleted_at: null,
        created_at: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const used_sick_leave = sick_leaves.reduce(
      (sum, leave) => sum + leave.total,
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

  // === DASHBOARD VÀ BÁO CÁO ===

  async getAttendanceDashboard(dashboardDto: AttendanceDashboardDto) {
    const { start_date, end_date, division_id, team_id, period_type } =
      dashboardDto;

    const startDate =
      start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // Lấy danh sách user theo phòng ban/team
    let userIds: number[] = [];
    if (team_id) {
      const teamMembers = await this.prisma.user_division.findMany({
        where: { teamId: team_id },
        select: { userId: true },
      });
      userIds = teamMembers.map((member) => member.userId);
    } else if (division_id) {
      const divisionMembers = await this.prisma.user_division.findMany({
        where: { divisionId: division_id },
        select: { userId: true },
      });
      userIds = divisionMembers.map((member) => member.userId);
    }

    const where: any = {
      checkin: {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
      deleted_at: null,
    };

    if (userIds.length > 0) {
      where.user_id = { in: userIds };
    }

    // Thống kê tổng quan
    const timesheets = await this.prisma.time_sheets.findMany({ where });

    const totalRecords = timesheets.length;
    const onTimeRecords = timesheets.filter(
      (t) => !t.late_time || t.late_time === 0,
    ).length;
    const lateRecords = timesheets.filter(
      (t) => t.late_time && t.late_time > 0,
    ).length;
    const earlyLeaveRecords = timesheets.filter(
      (t) => t.early_time && t.early_time > 0,
    ).length;
    const remoteRecords = timesheets.filter((t) => t.remote === 1).length;
    const totalPenalties = timesheets.reduce(
      (sum, t) => sum + (t.fines || 0),
      0,
    );

    // Thống kê theo ngày
    const dailyStats = this.groupAttendanceByPeriod(
      timesheets,
      period_type || 'daily',
    );

    // Top vi phạm
    const violationStats = await this.getViolationStatistics(
      userIds,
      startDate,
      endDate,
    );

    // Thống kê nghỉ phép
    const leaveStats = await this.getLeaveStatistics(
      userIds,
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
      if (!timesheet.late_time || timesheet.late_time === 0)
        grouped[key].on_time += 1;
      if (timesheet.late_time && timesheet.late_time > 0)
        grouped[key].late += 1;
      if (timesheet.early_time && timesheet.early_time > 0)
        grouped[key].early_leave += 1;
      if (timesheet.remote === 1) grouped[key].remote += 1;
      grouped[key].total_penalties += timesheet.fines || 0;
    });

    return Object.values(grouped).sort((a: any, b: any) =>
      a.period.localeCompare(b.period),
    );
  }

  private async getViolationStatistics(
    userIds: number[],
    startDate: string,
    endDate: string,
  ) {
    const where: any = {
      checkin: {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
      deleted_at: null,
    };

    if (userIds.length > 0) {
      where.user_id = { in: userIds };
    }

    const violations = await this.prisma.time_sheets.findMany({
      where: {
        ...where,
        OR: [
          { late_time: { gt: 0 } },
          { early_time: { gt: 0 } },
          { fines: { gt: 0 } },
        ],
      },
    });

    // Group by user_id
    const userViolations: { [key: number]: any } = {};

    violations.forEach((violation) => {
      const userId = violation.user_id;
      if (!userViolations[userId]) {
        userViolations[userId] = {
          user_id: userId,
          total_violations: 0,
          late_count: 0,
          early_leave_count: 0,
          total_penalties: 0,
          total_late_minutes: 0,
          total_early_minutes: 0,
        };
      }

      userViolations[userId].total_violations += 1;
      if (violation.late_time && violation.late_time > 0) {
        userViolations[userId].late_count += 1;
        userViolations[userId].total_late_minutes += violation.late_time;
      }
      if (violation.early_time && violation.early_time > 0) {
        userViolations[userId].early_leave_count += 1;
        userViolations[userId].total_early_minutes += violation.early_time;
      }
      userViolations[userId].total_penalties += violation.fines || 0;
    });

    return Object.values(userViolations)
      .sort((a: any, b: any) => b.total_penalties - a.total_penalties)
      .slice(0, 10); // Top 10
  }

  private async getLeaveStatistics(
    userIds: number[],
    startDate: string,
    endDate: string,
  ) {
    const where: any = {
      created_at: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      deleted_at: null,
      status: 2, // Đã duyệt
    };

    if (userIds.length > 0) {
      where.user_id = { in: userIds };
    }

    const leaves = await this.prisma.day_offs.findMany({ where });

    const stats = {
      total_leave_days: leaves.reduce((sum, leave) => sum + leave.total, 0),
      paid_leave: leaves
        .filter((l) => l.type === 1)
        .reduce((sum, leave) => sum + leave.total, 0),
      unpaid_leave: leaves
        .filter((l) => l.type === 2)
        .reduce((sum, leave) => sum + leave.total, 0),
      annual_leave: leaves
        .filter((l) => l.type === 3)
        .reduce((sum, leave) => sum + leave.total, 0),
      sick_leave: leaves
        .filter((l) => l.type === 4)
        .reduce((sum, leave) => sum + leave.total, 0),
      personal_leave: leaves
        .filter((l) => l.type === 5)
        .reduce((sum, leave) => sum + leave.total, 0),
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
      const userId = timesheet.user_id;
      if (!userStats[userId]) {
        userStats[userId] = {
          user_id: userId,
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

      userStats[userId].total_days += 1;
      if (!timesheet.late_time || timesheet.late_time === 0)
        userStats[userId].on_time_days += 1;
      if (timesheet.late_time && timesheet.late_time > 0) {
        userStats[userId].late_days += 1;
        userStats[userId].total_late_minutes += timesheet.late_time;
      }
      if (timesheet.early_time && timesheet.early_time > 0) {
        userStats[userId].early_leave_days += 1;
        userStats[userId].total_early_minutes += timesheet.early_time;
      }
      if (timesheet.remote === 1) userStats[userId].remote_days += 1;

      const workHours =
        ((timesheet.work_time_morning || 0) +
          (timesheet.work_time_afternoon || 0)) /
        60;
      userStats[userId].total_work_hours += workHours;
      userStats[userId].total_penalties += timesheet.fines || 0;
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
        date: timesheet.checkin.toISOString().split('T')[0],
        checkin: timesheet.checkin,
        checkout: timesheet.checkout,
        late_minutes: timesheet.late_time || 0,
        early_minutes: timesheet.early_time || 0,
        work_hours:
          ((timesheet.work_time_morning || 0) +
            (timesheet.work_time_afternoon || 0)) /
          60,
        penalties: timesheet.fines || 0,
        is_remote: timesheet.remote === 1,
        status: timesheet.status,
      })),
      generated_at: new Date(),
    };
  }

  private generatePenaltyReport(timesheets: any[], period: string) {
    const penaltyRecords = timesheets.filter((t) => (t.fines || 0) > 0);

    const totalPenalties = penaltyRecords.reduce(
      (sum, t) => sum + (t.fines || 0),
      0,
    );
    const penaltyByUser: { [key: number]: any } = {};

    penaltyRecords.forEach((record) => {
      const userId = record.user_id;
      if (!penaltyByUser[userId]) {
        penaltyByUser[userId] = {
          user_id: userId,
          total_penalty: 0,
          late_penalty: 0,
          early_penalty: 0,
          violation_count: 0,
        };
      }

      penaltyByUser[userId].total_penalty += record.fines || 0;
      penaltyByUser[userId].violation_count += 1;

      // Ước tính phân bổ phạt (có thể cải thiện với dữ liệu chi tiết hơn)
      if (record.late_time > 0)
        penaltyByUser[userId].late_penalty += (record.fines || 0) * 0.6;
      if (record.early_time > 0)
        penaltyByUser[userId].early_penalty += (record.fines || 0) * 0.4;
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
        penalty_amount: record.fines || 0,
      })),
      generated_at: new Date(),
    };
  }
}
