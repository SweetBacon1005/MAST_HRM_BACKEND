import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DayOffType,
  RemoteType,
  ApprovalStatus,
  TimesheetType,
  WorkShiftType,
  ScopeType,
} from '@prisma/client';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import {
  AttendanceCalculationDto,
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
import { WorkShiftPaginationDto } from './dto/pagination-queries.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private prisma: PrismaService) {}

    async calculateAttendance(attendanceDto: AttendanceCalculationDto) {
    const {
      user_id,
      checkin_time,
      checkout_time,
      shift_id,
      is_remote,
      note: _note,
    } = attendanceDto;

    const user = await this.prisma.users.findUnique({
      where: { id: user_id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với ID: ${user_id}`,
      );
    }

    const checkin = new Date(checkin_time);
    const checkout = new Date(checkout_time);

    if (checkin >= checkout) {
      throw new BadRequestException(
        'Thời gian check-out phải sau thời gian check-in',
      );
    }

    const workDate = checkin.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (checkin < thirtyDaysAgo) {
      throw new BadRequestException(
        'Không thể chấm công cho ngày quá 30 ngày trước',
      );
    }

    if (workDate > today) {
      throw new BadRequestException(
        'Không thể chấm công cho ngày trong tương lai',
      );
    }

    const workDurationHours =
      (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60);
    if (workDurationHours > 16) {
      throw new BadRequestException(
        'Thời gian làm việc không thể vượt quá 16 giờ một ngày',
      );
    }
    if (workDurationHours < 0.5) {
      throw new BadRequestException('Thời gian làm việc phải ít nhất 30 phút');
    }

    let workShift;
    if (shift_id) {
      workShift = await this.prisma.schedule_works.findUnique({
        where: { id: shift_id, deleted_at: null },
      });
      if (!workShift) {
        throw new NotFoundException(
          `Không tìm thấy ca làm việc với ID: ${shift_id}`,
        );
      }
    } else {
      workShift = await this.prisma.schedule_works.findFirst({
        where: {
          start_date: { lte: new Date(workDate) },
          end_date: { gte: new Date(workDate) },
          type: WorkShiftType.NORMAL, // Ca thường
          deleted_at: null,
        },
        orderBy: { created_at: 'desc' },
      });
    }

    if (!workShift) {
      throw new NotFoundException(
        'Không tìm thấy ca làm việc phù hợp cho ngày này',
      );
    }

    const calculations = this.calculateWorkingTime(
      checkin,
      checkout,
      workShift,
    );

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

    this.logger.log(
      `Tính toán chấm công cho user ${user_id}, ngày ${workDate}`,
    );

    const attendanceData = {
      work_date: new Date(workDate),
      user_id,
      checkin,
      checkout,
      checkin_checkout: `${checkin_time} - ${checkout_time}`,
      late_time: calculations.late_minutes,
      early_time: calculations.early_minutes,
      work_time_morning: calculations.morning_minutes,
      work_time_afternoon: calculations.afternoon_minutes,
      remote: is_remote ? RemoteType.REMOTE : RemoteType.OFFICE,
      is_complete: true,
      status: ApprovalStatus.PENDING,
      type: TimesheetType.NORMAL,
    };

    try {
      if (existingAttendance) {
        const result = await this.prisma.time_sheets.update({
          where: { id: existingAttendance.id },
          data: attendanceData,
        });
        this.logger.log(`Cập nhật chấm công thành công cho user ${user_id}`);
        return result;
      } else {
        const result = await this.prisma.time_sheets.create({
          data: attendanceData,
        });
        this.logger.log(`Tạo chấm công mới thành công cho user ${user_id}`);
        return result;
      }
    } catch (error) {
      this.logger.error(`Lỗi khi lưu chấm công: ${error.message}`, error.stack);
      throw new UnprocessableEntityException(
        'Không thể lưu thông tin chấm công',
      );
    }
  }

  private calculateWorkingTime(checkin: Date, checkout: Date, workShift: any) {
    const morningStart = new Date(workShift.hour_start_morning);
    const morningEnd = new Date(workShift.hour_end_morning);
    const afternoonStart = new Date(workShift.hour_start_afternoon);
    const afternoonEnd = new Date(workShift.hour_end_afternoon);

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

    const late_minutes =
      checkin > morningStart
        ? Math.floor((checkin.getTime() - morningStart.getTime()) / (1000 * 60))
        : 0;

    const early_minutes =
      checkout < afternoonEnd
        ? Math.floor(
            (afternoonEnd.getTime() - checkout.getTime()) / (1000 * 60),
          )
        : 0;

    const actualMorningStart = checkin > morningStart ? checkin : morningStart;
    const actualMorningEnd = checkout < morningEnd ? checkout : morningEnd;
    const morning_minutes =
      actualMorningEnd > actualMorningStart
        ? Math.floor(
            (actualMorningEnd.getTime() - actualMorningStart.getTime()) /
              (1000 * 60),
          )
        : 0;

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

    async createWorkShift(workShiftDto: WorkShiftDto) {
    const {
      name,
      morning_start,
      morning_end,
      afternoon_start,
      afternoon_end,
      type,
    } = workShiftDto;

    const existingShift = await this.prisma.schedule_works.findFirst({
      where: {
        name: {
          equals: name,
        },
        deleted_at: null,
      },
    });

    if (existingShift) {
      throw new ConflictException(`Ca làm việc với tên "${name}" đã tồn tại`);
    }

    const morningStart = new Date(morning_start);
    const morningEnd = new Date(morning_end);
    const afternoonStart = new Date(afternoon_start);
    const afternoonEnd = new Date(afternoon_end);

    if (morningStart >= morningEnd) {
      throw new BadRequestException(
        'Giờ kết thúc buổi sáng phải sau giờ bắt đầu',
      );
    }

    if (afternoonStart >= afternoonEnd) {
      throw new BadRequestException(
        'Giờ kết thúc buổi chiều phải sau giờ bắt đầu',
      );
    }

    if (morningEnd >= afternoonStart) {
      throw new BadRequestException(
        'Giờ bắt đầu buổi chiều phải sau giờ kết thúc buổi sáng',
      );
    }

    try {
      const result = await this.prisma.schedule_works.create({
        data: {
          name,
          hour_start_morning: morningStart,
          hour_end_morning: morningEnd,
          hour_start_afternoon: afternoonStart,
          hour_end_afternoon: afternoonEnd,
          type: type || WorkShiftType.NORMAL,
          start_date: new Date(),
          end_date: new Date(new Date().getFullYear() + 1, 11, 31), // Hết năm
        },
      });

      this.logger.log(`Tạo ca làm việc mới thành công: ${name}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tạo ca làm việc: ${error.message}`,
        error.stack,
      );
      throw new UnprocessableEntityException('Không thể tạo ca làm việc');
    }
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

    if (paginationDto.shift_name) {
      where.name = {
        contains: paginationDto.shift_name,
        
      };
    }

    if (paginationDto.status) {
      where.status = paginationDto.status;
    }

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

    const user = await this.prisma.users.findUnique({
      where: { id: user_id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với ID: ${user_id}`,
      );
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDateObj < today) {
      throw new BadRequestException('Ngày bắt đầu nghỉ phải từ hôm nay trở đi');
    }

    if (endDateObj < startDateObj) {
      throw new BadRequestException(
        'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
      );
    }

    const daysDiff =
      Math.ceil(
        (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    if (Math.abs(daysDiff - total_days) > 0.5) {
      throw new BadRequestException(
        'Số ngày nghỉ không khớp với khoảng thời gian đăng ký',
      );
    }

    if (
      leave_type === DayOffType.COMPENSATORY ||
      leave_type === DayOffType.PAID
    ) {
      const leaveBalance = await this.getLeaveBalance(
        user_id,
        startDateObj.getFullYear(),
      );
      if (leaveBalance.remaining_annual_leave < total_days) {
        throw new BadRequestException(
          `Số ngày phép năm không đủ. Còn lại: ${leaveBalance.remaining_annual_leave} ngày, yêu cầu: ${total_days} ngày`,
        );
      }
    }

    const conflictingLeave = await this.prisma.day_offs.findFirst({
      where: {
        user_id,
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
        deleted_at: null,
        OR: [
          {
            AND: [
              {
                work_date: {
                  gte: new Date(start_date),
                  lte: new Date(end_date),
                },
              },
            ],
          },
        ],
      },
    });

    if (conflictingLeave) {
      throw new ConflictException(
        `Đã có đơn nghỉ phép trùng thời gian cho ngày ${conflictingLeave.work_date.toISOString().split('T')[0]}`,
      );
    }

    try {
      const result = await this.prisma.day_offs.create({
        data: {
          user_id,
          work_date: startDateObj,
          duration: 'FULL_DAY', // Default to full day
          title: `Đơn nghỉ phép từ ${start_date} đến ${end_date}`,
          status: ApprovalStatus.PENDING,
          type: leave_type as DayOffType,
          reason: `Nghỉ phép từ ${start_date} đến ${end_date}`,
          is_past: false,
        },
      });

      this.logger.log(
        `Tạo đơn nghỉ phép thành công cho user ${user_id}, từ ${start_date} đến ${end_date}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tạo đơn nghỉ phép: ${error.message}`,
        error.stack,
      );
      throw new UnprocessableEntityException('Không thể tạo đơn nghỉ phép');
    }
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

    const user = await this.prisma.users.findUnique({
      where: { id: user_id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với ID: ${user_id}`,
      );
    }

    const workDateObj = new Date(work_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (workDateObj < today) {
      throw new BadRequestException(
        'Không thể đăng ký làm việc từ xa cho ngày quá khứ',
      );
    }

    const maxFutureDate = new Date();
    maxFutureDate.setDate(today.getDate() + 30);
    if (workDateObj > maxFutureDate) {
      throw new BadRequestException(
        'Chỉ có thể đăng ký làm việc từ xa trước 30 ngày',
      );
    }

    if (!is_full_day) {
      if (!start_time || !end_time) {
        throw new BadRequestException(
          'Phải cung cấp thời gian bắt đầu và kết thúc khi không làm cả ngày',
        );
      }

      const startTimeObj = new Date(start_time);
      const endTimeObj = new Date(end_time);

      if (startTimeObj >= endTimeObj) {
        throw new BadRequestException(
          'Thời gian kết thúc phải sau thời gian bắt đầu',
        );
      }

      const workDurationHours =
        (endTimeObj.getTime() - startTimeObj.getTime()) / (1000 * 60 * 60);
      if (workDurationHours < 1) {
        throw new BadRequestException(
          'Thời gian làm việc từ xa phải ít nhất 1 giờ',
        );
      }
      if (workDurationHours > 10) {
        throw new BadRequestException(
          'Thời gian làm việc từ xa không quá 10 giờ',
        );
      }
    }

    const existingRequest = await this.prisma.time_sheets.findFirst({
      where: {
        user_id,
        checkin: {
          gte: new Date(work_date + 'T00:00:00.000Z'),
          lt: new Date(work_date + 'T23:59:59.999Z'),
        },
        remote: RemoteType.REMOTE,
        deleted_at: null,
      },
    });

    if (existingRequest) {
      throw new ConflictException('Đã có yêu cầu làm việc từ xa cho ngày này');
    }

    const checkin = is_full_day
      ? new Date(work_date + 'T08:00:00.000Z')
      : new Date(start_time!);
    const checkout = is_full_day
      ? new Date(work_date + 'T17:30:00.000Z')
      : new Date(end_time!);

    try {
      const result = await this.prisma.time_sheets.create({
        data: {
          work_date: workDateObj,
          user_id,
          checkin,
          checkout,
          remote: RemoteType.REMOTE,
          status: ApprovalStatus.PENDING,
          is_complete: true,
          type: TimesheetType.NORMAL,
          work_time_morning: is_full_day
            ? 240
            : Math.floor(
                (checkout.getTime() - checkin.getTime()) / (1000 * 60),
              ),
          work_time_afternoon: is_full_day ? 240 : 0,
        },
      });

      this.logger.log(
        `Tạo yêu cầu làm việc từ xa thành công cho user ${user_id}, ngày ${work_date}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Lỗi khi tạo yêu cầu làm việc từ xa: ${error.message}`,
        error.stack,
      );
      throw new UnprocessableEntityException(
        'Không thể tạo yêu cầu làm việc từ xa',
      );
    }
  }

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

    const used_leaves = await this.prisma.day_offs.findMany({
      where: {
        user_id,
        type: 'PAID',
        status: 'APPROVED',
        deleted_at: null,
        created_at: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const used_annual_leave = used_leaves.reduce(
      (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
      0,
    );

    const sick_leaves = await this.prisma.day_offs.findMany({
      where: {
        user_id,
        type: 'SICK',
        status: 'APPROVED',
        deleted_at: null,
        created_at: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

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

    const where: any = {
      checkin: {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
      deleted_at: null,
    };

    if (user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

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
    const where: any = {
      checkin: {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
      deleted_at: null,
    };

    if (user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    const violations = await this.prisma.time_sheets.findMany({
      where: {
        ...where,
        OR: [{ late_time: { gt: 0 } }, { early_time: { gt: 0 } }],
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

      userViolations[user_id].total_violations += 1;
      if (violation.late_time && violation.late_time > 0) {
        userViolations[user_id].late_count += 1;
        userViolations[user_id].total_late_minutes += violation.late_time;
      }
      if (violation.early_time && violation.early_time > 0) {
        userViolations[user_id].early_leave_count += 1;
        userViolations[user_id].total_early_minutes += violation.early_time;
      }
      userViolations[user_id].total_penalties += 0;
    });

    return Object.values(userViolations)
      .sort((a: any, b: any) => b.total_penalties - a.total_penalties)
      .slice(0, 10); // Top 10
  }

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
      status: ApprovalStatus.APPROVED, // Đã duyệt
    };

    if (user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    const leaves = await this.prisma.day_offs.findMany({ where });

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
      if (!timesheet.late_time || timesheet.late_time === 0)
        userStats[user_id].on_time_days += 1;
      if (timesheet.late_time && timesheet.late_time > 0) {
        userStats[user_id].late_days += 1;
        userStats[user_id].total_late_minutes += timesheet.late_time;
      }
      if (timesheet.early_time && timesheet.early_time > 0) {
        userStats[user_id].early_leave_days += 1;
        userStats[user_id].total_early_minutes += timesheet.early_time;
      }
      if (timesheet.remote === RemoteType.REMOTE)
        userStats[user_id].remote_days += 1;

      const workHours =
        ((timesheet.work_time_morning || 0) +
          (timesheet.work_time_afternoon || 0)) /
        60;
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
        date: record.checkin.toISOString().split('T')[0],
        late_minutes: record.late_time || 0,
        early_minutes: record.early_time || 0,
        penalty_amount: 0,
      })),
      generated_at: new Date(),
    };
  }
}
