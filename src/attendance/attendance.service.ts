import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DayOffType,
  RemoteType,
  ApprovalStatus,
  TimesheetType,
  ScopeType,
} from '@prisma/client';
import { ATTENDANCE_ERRORS } from '../common/constants/error-messages.constants';
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
import { AttendanceRequestService } from '../requests/services/attendance-request.service';
import { DayOffDetailService } from '../requests/services/day-off-detail.service';
import { TimesheetService } from '../timesheet/timesheet.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private attendanceRequestService: AttendanceRequestService,
    private dayOffDetailService: DayOffDetailService,
    private timesheetService: TimesheetService,
    private configService: ConfigService,
  ) {}

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
      throw new NotFoundException(ATTENDANCE_ERRORS.USER_NOT_FOUND_FOR_ATTENDANCE);
    }

    const checkin = new Date(checkin_time);
    const checkout = new Date(checkout_time);

    if (checkin >= checkout) {
      throw new BadRequestException(ATTENDANCE_ERRORS.CHECKOUT_BEFORE_CHECKIN);
    }

    const workDate = checkin.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (checkin < thirtyDaysAgo) {
      throw new BadRequestException(ATTENDANCE_ERRORS.CANNOT_ATTEND_PAST_30_DAYS);
    }

    if (workDate > today) {
      throw new BadRequestException(ATTENDANCE_ERRORS.CANNOT_ATTEND_FUTURE);
    }

    const workDurationHours =
      (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60);
    if (workDurationHours > 16) {
      throw new BadRequestException(ATTENDANCE_ERRORS.WORK_DURATION_TOO_LONG);
    }
    if (workDurationHours < 0.5) {
      throw new BadRequestException(ATTENDANCE_ERRORS.WORK_DURATION_TOO_SHORT);
    }

    // REMOVED: schedule_works table - Using hardcoded schedule
    const startMorning = this.configService.get<string>('START_MORNING_WORK_TIME', '8:30');
    const endMorning = this.configService.get<string>('END_MORNING_WORK_TIME', '12:00');
    const startAfternoon = this.configService.get<string>('START_AFTERNOON_WORK_TIME', '13:00');
    const endAfternoon = this.configService.get<string>('END_AFTERNOON_WORK_TIME', '17:30');

    const workShift = {
      hour_start_morning: startMorning,
      hour_end_morning: endMorning,
      hour_start_afternoon: startAfternoon,
      hour_end_afternoon: endAfternoon,
      type: 'NORMAL',
    };

    const calculations = this.calculateWorkingTime(
      checkin,
      checkout,
      workShift,
    );

    const existingAttendance = await this.prisma.time_sheets.findFirst({
      where: {
        user_id,
        checkin: {
          gte: (() => { const d = new Date(workDate); d.setHours(0, 0, 0, 0); return d; })(),
          lt: (() => { const d = new Date(workDate); d.setHours(23, 59, 59, 999); return d; })(),
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
      // REMOVED: late_time, early_time, work_time_morning/afternoon
      total_work_time: calculations.total_work_minutes,
      remote: is_remote ? RemoteType.REMOTE : RemoteType.OFFICE,
      is_complete: true,
      type: TimesheetType.NORMAL,
    };

    try {
      let result;
      if (existingAttendance) {
        result = await this.prisma.time_sheets.update({
          where: { id: existingAttendance.id },
          data: attendanceData,
        });
        this.logger.log(`Cập nhật chấm công thành công cho user ${user_id}`);
      } else {
        result = await this.prisma.time_sheets.create({
          data: attendanceData,
        });
        this.logger.log(`Tạo chấm công mới thành công cho user ${user_id}`);
      }

      // Cập nhật is_complete dựa trên required_work_time
      await this.timesheetService.updateTimesheetCompleteStatus(result.id);

      return result;
    } catch (error) {
      this.logger.error(`Lỗi khi lưu chấm công: ${error.message}`, error.stack);
      throw new UnprocessableEntityException(ATTENDANCE_ERRORS.ATTENDANCE_SAVE_FAILED);
    }
  }

  private parseTimeToDate(timeString: string, referenceDate: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(referenceDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private calculateWorkingTime(checkin: Date, checkout: Date, workShift: any) {
    const morningStart = this.parseTimeToDate(workShift.hour_start_morning, checkin);
    const morningEnd = this.parseTimeToDate(workShift.hour_end_morning, checkin);
    const afternoonStart = this.parseTimeToDate(workShift.hour_start_afternoon, checkin);
    const afternoonEnd = this.parseTimeToDate(workShift.hour_end_afternoon, checkin);

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

  private validateTimeFormat(timeString: string, fieldName: string): void {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeString)) {
      throw new BadRequestException(`${fieldName} ${ATTENDANCE_ERRORS.INVALID_TIME_FORMAT}`);
    }
  }

  private compareTimeStrings(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;
    return minutes1 < minutes2 ? -1 : minutes1 > minutes2 ? 1 : 0;
  }

  // REMOVED: Work shift management - Using hardcoded schedule
  async createWorkShift(workShiftDto: WorkShiftDto) {
    throw new BadRequestException('Work shift management is deprecated. Using hardcoded schedule: 8:30-12:00, 13:00-17:30');
    /*
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
      throw new ConflictException(ATTENDANCE_ERRORS.WORK_SHIFT_NAME_EXISTS);
    }

    this.validateTimeFormat(morning_start, 'Giờ bắt đầu buổi sáng');
    this.validateTimeFormat(morning_end, 'Giờ kết thúc buổi sáng');
    this.validateTimeFormat(afternoon_start, 'Giờ bắt đầu buổi chiều');
    this.validateTimeFormat(afternoon_end, 'Giờ kết thúc buổi chiều');

    if (this.compareTimeStrings(morning_start, morning_end) >= 0) {
      throw new BadRequestException(ATTENDANCE_ERRORS.MORNING_END_BEFORE_START);
    }

    if (this.compareTimeStrings(afternoon_start, afternoon_end) >= 0) {
      throw new BadRequestException(ATTENDANCE_ERRORS.AFTERNOON_END_BEFORE_START);
    }

    if (this.compareTimeStrings(morning_end, afternoon_start) >= 0) {
      throw new BadRequestException(ATTENDANCE_ERRORS.AFTERNOON_BEFORE_MORNING);
    }

    try {
      const currentYear = new Date().getFullYear();
      const result = await this.prisma.schedule_works.create({
        data: {
          name,
          hour_start_morning: morning_start,
          hour_end_morning: morning_end,
          hour_start_afternoon: afternoon_start,
          hour_end_afternoon: afternoon_end,
          type: type || 'NORMAL',
          start_date: new Date(currentYear, 0, 1), // 1/1 năm hiện tại
          end_date: new Date(currentYear, 11, 31), // 31/12 năm hiện tại
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
    */
  }

  async getAllWorkShifts() {
    throw new BadRequestException('Work shift management is deprecated');
    /*
    return this.prisma.schedule_works.findMany({
      where: { deleted_at: null },
      orderBy: { type: 'asc' },
    });
    */
  }

  async getAllWorkShiftsPaginated(paginationDto: WorkShiftPaginationDto) {
    throw new BadRequestException('Work shift management is deprecated');
    /*
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = { deleted_at: null };

    if (paginationDto.shift_name) {
      where.name = {
        contains: paginationDto.shift_name,
        
      };
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
    */
  }

  async updateWorkShift(id: number, workShiftDto: Partial<WorkShiftDto>) {
    throw new BadRequestException('Work shift management is deprecated');
    /*
    const workShift = await this.prisma.schedule_works.findUnique({
      where: { id },
    });

    if (!workShift) {
      throw new NotFoundException(ATTENDANCE_ERRORS.WORK_SHIFT_NOT_FOUND);
    }

    if (workShiftDto.morning_start) {
      this.validateTimeFormat(workShiftDto.morning_start, 'Giờ bắt đầu buổi sáng');
    }
    if (workShiftDto.morning_end) {
      this.validateTimeFormat(workShiftDto.morning_end, 'Giờ kết thúc buổi sáng');
    }
    if (workShiftDto.afternoon_start) {
      this.validateTimeFormat(workShiftDto.afternoon_start, 'Giờ bắt đầu buổi chiều');
    }
    if (workShiftDto.afternoon_end) {
      this.validateTimeFormat(workShiftDto.afternoon_end, 'Giờ kết thúc buổi chiều');
    }

    const morningStart = workShiftDto.morning_start || workShift.hour_start_morning;
    const morningEnd = workShiftDto.morning_end || workShift.hour_end_morning;
    const afternoonStart = workShiftDto.afternoon_start || workShift.hour_start_afternoon;
    const afternoonEnd = workShiftDto.afternoon_end || workShift.hour_end_afternoon;

    if (this.compareTimeStrings(morningStart, morningEnd) >= 0) {
      throw new BadRequestException(ATTENDANCE_ERRORS.MORNING_END_BEFORE_START);
    }

    if (this.compareTimeStrings(afternoonStart, afternoonEnd) >= 0) {
      throw new BadRequestException(ATTENDANCE_ERRORS.AFTERNOON_END_BEFORE_START);
    }

    if (this.compareTimeStrings(morningEnd, afternoonStart) >= 0) {
      throw new BadRequestException(ATTENDANCE_ERRORS.AFTERNOON_BEFORE_MORNING);
    }

    return this.prisma.schedule_works.update({
      where: { id },
      data: {
        name: workShiftDto.name,
        type: workShiftDto.type,
        hour_start_morning: workShiftDto.morning_start,
        hour_end_morning: workShiftDto.morning_end,
        hour_start_afternoon: workShiftDto.afternoon_start,
        hour_end_afternoon: workShiftDto.afternoon_end,
      },
    });
    */
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

    const conflictingLeave = await this.attendanceRequestService.findMany({
      user_id,
      request_type: 'DAY_OFF',
      status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
      deleted_at: null,
      work_date: { gte: new Date(start_date), lte: new Date(end_date) },
    });

    if (conflictingLeave.length > 0) {
      throw new ConflictException(
        `Đã có đơn nghỉ phép trùng thời gian cho ngày ${conflictingLeave[0].work_date.toISOString().split('T')[0]}`,
      );
    }

    try {
      let timesheet = await this.prisma.time_sheets.findFirst({
        where: { user_id, work_date: startDateObj },
      });
      if (!timesheet) {
        timesheet = await this.prisma.time_sheets.create({
          data: { user_id, work_date: startDateObj, type: 'NORMAL' },
        });
      }

      const attendanceRequest = await this.attendanceRequestService.createAttendanceRequest({
        user_id,
        timesheet_id: timesheet.id,
        work_date: startDateObj,
        request_type: 'DAY_OFF',
        title: `Đơn nghỉ phép từ ${start_date} đến ${end_date}`,
        reason: `Nghỉ phép từ ${start_date} đến ${end_date}`,
      });

      const result = await this.dayOffDetailService.createDayOffDetail({
        request_id: attendanceRequest.id,
        duration: 'FULL_DAY',
        type: leave_type as DayOffType,
      });

      this.logger.log(
        `Tạo đơn nghỉ phép thành công cho user ${user_id}, từ ${start_date} đến ${end_date}`,
      );
      return { ...attendanceRequest, ...result };
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
          gte: (() => { const d = new Date(work_date); d.setHours(0, 0, 0, 0); return d; })(),
          lt: (() => { const d = new Date(work_date); d.setHours(23, 59, 59, 999); return d; })(),
        },
        remote: RemoteType.REMOTE,
        deleted_at: null,
      },
    });

    if (existingRequest) {
      throw new ConflictException('Đã có yêu cầu làm việc từ xa cho ngày này');
    }

    let checkin: Date;
    let checkout: Date;
    
    if (is_full_day) {
      checkin = new Date(work_date);
      checkin.setHours(8, 0, 0, 0);
      checkout = new Date(work_date);
      checkout.setHours(17, 30, 0, 0);
    } else {
      checkin = new Date(start_time!);
      checkout = new Date(end_time!);
    }

    try {
      const result = await this.prisma.time_sheets.create({
        data: {
          work_date: workDateObj,
          user_id,
          checkin,
          checkout,
          remote: RemoteType.REMOTE,
          is_complete: true,
          type: TimesheetType.NORMAL,
          // REMOVED: work_time_morning/afternoon - use total_work_time
          total_work_time: is_full_day 
            ? (() => {
                const startMorning = this.configService.get<string>('START_MORNING_WORK_TIME', '8:30');
                const endMorning = this.configService.get<string>('END_MORNING_WORK_TIME', '12:00');
                const startAfternoon = this.configService.get<string>('START_AFTERNOON_WORK_TIME', '13:00');
                const endAfternoon = this.configService.get<string>('END_AFTERNOON_WORK_TIME', '17:30');
                const parseTime = (timeStr: string) => {
                  const [hour, minute] = timeStr.split(':').map(Number);
                  return hour * 60 + minute;
                };
                const morningMinutes = parseTime(endMorning) - parseTime(startMorning);
                const afternoonMinutes = parseTime(endAfternoon) - parseTime(startAfternoon);
                return morningMinutes + afternoonMinutes;
              })()
            : Math.floor((checkout.getTime() - checkin.getTime()) / (1000 * 60)),
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

    const used_leaves_requests = await this.attendanceRequestService.findMany({
      user_id,
      request_type: 'DAY_OFF',
      status: 'APPROVED',
      deleted_at: null,
      created_at: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
    });
    const used_leaves = used_leaves_requests.map(r => r.day_off).filter((d): d is NonNullable<typeof d> => d !== null && d !== undefined);

    const used_annual_leave = used_leaves.reduce(
      (sum, leave) => sum + (leave.duration === 'FULL_DAY' ? 1 : 0.5),
      0,
    );

    const sick_leaves_requests = await this.attendanceRequestService.findMany({
      user_id,
      request_type: 'DAY_OFF',
      status: 'APPROVED',
      deleted_at: null,
      created_at: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
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
      this.attendanceRequestService.findMany({ ...baseWhere, request_type: 'DAY_OFF' }),
      this.attendanceRequestService.findMany({ ...baseWhere, request_type: 'REMOTE_WORK' }),
      this.attendanceRequestService.findMany({ ...baseWhere, request_type: 'LATE_EARLY' }),
      this.attendanceRequestService.findMany({ ...baseWhere, request_type: 'FORGOT_CHECKIN' }),
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

    const leaveRequests = await this.attendanceRequestService.findMany(where);
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
