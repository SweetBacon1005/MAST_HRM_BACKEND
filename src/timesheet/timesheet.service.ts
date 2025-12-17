import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  ApprovalStatus,
  AttendanceRequestType,
  DayOffDuration,
  HolidayStatus,
  Prisma,
  ScopeType,
} from '@prisma/client';
import type { Request } from 'express';
import {
  SUCCESS_MESSAGES,
  TIMESHEET_ERRORS,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import { ip_validationService } from '../common/services/ip-validation.service';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { AttendanceRequestService } from '../requests/services/attendance-request.service';
import { UploadService } from '../upload/upload.service';
import {
  AttendanceLogQueryDto,
  CreateAttendanceLogDto,
  UpdateAttendanceLogDto,
} from './dto/attendance-log.dto';
import { CheckinDto, CheckoutDto } from './dto/checkin-checkout.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { GetScheduleDto } from './dto/get-schedule.dto';
import {
  AttendanceLogPaginationDto,
  HolidayPaginationDto,
  TimesheetPaginationDto,
} from './dto/pagination-queries.dto';
import {
  TimesheetReportDto,
  WorkingTimeReportDto,
} from './dto/timesheet-report.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { DayOffCalculator } from './enums/day-off.enum';
import { ApprovalStatusManager } from './enums/timesheet-status.enum';
import { QueryUtil } from './utils/query.util';

@Injectable()
export class TimesheetService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private ip_validationService: ip_validationService,
    private uploadService: UploadService,
    private attendanceRequestService: AttendanceRequestService,
    @Inject(REQUEST) private request: Request,
  ) {}

  async createTimesheet(
    createTimesheetDto: CreateTimesheetDto,
    user_id: number,
  ) {
    const user = await this.prisma.users.findFirst({
      where: { id: user_id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    const approvedDayOffRequests = await this.attendanceRequestService.findMany(
      {
        user_id: user_id,
        work_date: new Date(createTimesheetDto.work_date),
        request_type: 'DAY_OFF',
        status: ApprovalStatus.APPROVED,
        deleted_at: null,
      },
    );
    const approvedDayOff = approvedDayOffRequests[0]?.day_off;

    if (approvedDayOff) {
      const needsAttendance = DayOffCalculator.needsAttendance(
        approvedDayOff.duration as DayOffDuration,
      );

      if (!needsAttendance) {
        throw new BadRequestException(
          TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS,
        );
      }
    }

    const existingTimesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: user_id,
        work_date: new Date(createTimesheetDto.work_date),
        deleted_at: null,
      },
    });

    if (existingTimesheet) {
      throw new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS);
    }

    // Auto-detect if work_date is a holiday
    let timesheetType = createTimesheetDto.type;
    if (!timesheetType || timesheetType === 'NORMAL') {
      const isHoliday = await this.prisma.holidays.findFirst({
        where: {
          status: HolidayStatus.ACTIVE,
          deleted_at: null,
          start_date: { lte: new Date(createTimesheetDto.work_date) },
          end_date: { gte: new Date(createTimesheetDto.work_date) },
        },
      });
      if (isHoliday) {
        timesheetType = 'HOLIDAY';
      }
    }

    return this.prisma.time_sheets.create({
      data: {
        ...createTimesheetDto,
        user_id: user_id,
        work_date: new Date(createTimesheetDto.work_date),
        checkin: createTimesheetDto.checkin
          ? new Date(createTimesheetDto.checkin)
          : null,
        checkout: createTimesheetDto.checkout
          ? new Date(createTimesheetDto.checkout)
          : null,
        is_complete: createTimesheetDto.is_complete ? true : false,
        status: 'PENDING',
        type: timesheetType,
        remote: createTimesheetDto.remote,
      },
    });
  }

  async findAllTimesheets(
    user_id: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: Prisma.time_sheetsWhereInput = {
      user_id: user_id,
      deleted_at: null,
    };

    if (startDate && endDate) {
      Object.assign(where, QueryUtil.workDateRange(startDate, endDate));
    }

    return this.prisma.time_sheets.findMany({
      where,
      orderBy: { work_date: 'desc' },
    });
  }

  async findMyTimesheetsPaginated(
    user_id: number,
    paginationDto: TimesheetPaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.time_sheetsWhereInput = {
      user_id: user_id,
      deleted_at: null,
    };

    if (paginationDto.start_date && paginationDto.end_date) {
      Object.assign(
        where,
        QueryUtil.workDateRange(
          paginationDto.start_date,
          paginationDto.end_date,
        ),
      );
    }

    if (paginationDto.status) {
      where.status = paginationDto.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.time_sheets.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { work_date: 'desc' },
        include: {
          user: {
            select: { email: true },
          },
        },
      }),
      this.prisma.time_sheets.count({ where }),
    ]);

    if (data.length === 0) {
      return buildPaginationResponse(
        [],
        0,
        paginationDto.page || 1,
        paginationDto.limit || 10,
      );
    }

    const workDates = data.map((t) => {
      const dateStr = t.work_date.toISOString().split('T')[0];
      return new Date(dateStr);
    });

    const [
      allRemoteWorkRequests,
      allDayOffRequests,
      allOvertimeRequests,
      allLateEarlyRequests,
      allForgotCheckinRequests,
    ] = await Promise.all([
      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: { in: workDates },
        request_type: 'REMOTE_WORK',
        deleted_at: null,
      }),

      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: { in: workDates },
        request_type: 'DAY_OFF',
        deleted_at: null,
      }),

      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: { in: workDates },
        request_type: 'OVERTIME',
        deleted_at: null,
      }),

      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: { in: workDates },
        request_type: 'LATE_EARLY',
        deleted_at: null,
      }),

      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: { in: workDates },
        request_type: 'FORGOT_CHECKIN',
        deleted_at: null,
      }),
    ]);

    const groupByDate = (items: any[]) => {
      const map = new Map<string, any[]>();
      items.forEach((item) => {
        const dateKey = item.work_date.toISOString().split('T')[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(item);
      });
      return map;
    };

    const remoteWorkMap = groupByDate(allRemoteWorkRequests);
    const dayOffMap = groupByDate(allDayOffRequests);
    const overtimeMap = groupByDate(allOvertimeRequests);
    const lateEarlyMap = groupByDate(allLateEarlyRequests);
    const forgotCheckinMap = groupByDate(allForgotCheckinRequests);

    const enhancedData = data.map((timesheet) => {
      const dateKey = timesheet.work_date.toISOString().split('T')[0];

      return {
        ...timesheet,
        requests: {
          remote_work: remoteWorkMap.get(dateKey) || [],
          day_off: dayOffMap.get(dateKey) || [],
          overtime: overtimeMap.get(dateKey) || [],
          late_early: lateEarlyMap.get(dateKey) || [],
          forgot_checkin: forgotCheckinMap.get(dateKey) || [],
        },
      };
    });

    return buildPaginationResponse(
      enhancedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findTimesheetById(id: number) {
    const timesheet = await this.prisma.time_sheets.findFirst({
      where: { id, deleted_at: null },
    });

    if (!timesheet) {
      throw new NotFoundException('Không tìm thấy timesheet');
    }

    return timesheet;
  }

  async updateTimesheet(id: number, updateTimesheetDto: UpdateTimesheetDto) {
    const timesheet = await this.findTimesheetById(id);

    const currentState = timesheet.status
      ? timesheet.status
      : ApprovalStatus.PENDING;
    if (!ApprovalStatusManager.canEdit(currentState)) {
      throw new BadRequestException(
        `Không thể sửa timesheet ở trạng thái: ${ApprovalStatusManager.getStateName(currentState)}`,
      );
    }

    const { is_complete, ...rest } = updateTimesheetDto;

    return this.prisma.time_sheets.update({
      where: { id },
      data: {
        ...rest,
        work_date: new Date(),
        checkin: updateTimesheetDto.checkin
          ? new Date(updateTimesheetDto.checkin)
          : undefined,
        checkout: updateTimesheetDto.checkout
          ? new Date(updateTimesheetDto.checkout)
          : undefined,
        is_complete: is_complete ? true : false,
        status: 'PENDING',
        type: 'NORMAL',
        remote: 'OFFICE',
      },
    });
  }

  async removeTimesheet(id: number) {
    const timesheet = await this.findTimesheetById(id);

    const currentState = timesheet.status
      ? timesheet.status
      : ApprovalStatus.PENDING;
    if (!ApprovalStatusManager.canDelete(currentState)) {
      throw new BadRequestException(
        `Không thể xóa timesheet ở trạng thái: ${ApprovalStatusManager.getStateName(currentState)}`,
      );
    }

    return this.prisma.time_sheets.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async registerFace(user_id: number, photo_url: string) {
    const user = await this.prisma.users.findFirst({
      where: { id: user_id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    if (
      !this.uploadService.validateCloudinaryUrl(photo_url) ||
      user.register_face_url
    ) {
      throw new BadRequestException(
        'URL ảnh không hợp lệ hoặc khuôn mặt đã được đăng ký',
      );
    }

    await this.prisma.users.update({
      where: { id: user_id },
      data: {
        register_face_url: photo_url,
        register_face_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'Đăng ký khuôn mặt thành công',
      user_id,
      photo_url,
      register_face_at: new Date(),
    };
  }

  async checkin(user_id: number, checkinDto: CheckinDto) {
    const today = new Date().toISOString().split('T')[0];
    const checkin_time = new Date();

    const client_ip = this.ip_validationService.getclient_ip(this.request);

    const ip_validation =
      await this.ip_validationService.validateIpForAttendance(
        user_id,
        client_ip,
        today,
      );

    if (!ip_validation.isValid) {
      throw new BadRequestException(ip_validation.message);
    }

    const idempotencyKey = `checkin_${user_id}_${today}`;

    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.users.findFirst({
          where: { id: user_id, deleted_at: null },
        });

        if (!user) {
          throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
        }

        if (!checkinDto?.photo_url) {
          throw new BadRequestException('Thiếu photo_url sau khi xác thực ảnh');
        }

        const existingCheckin = await tx.attendance_logs.findFirst({
          where: {
            user_id: user_id,
            action_type: 'checkin',
            work_date: new Date(today),
            deleted_at: null,
          },
          include: {
            timesheet: true,
          },
        });

        if (existingCheckin) {
          throw new BadRequestException('Bạn đã check-in hôm nay rồi');
        }

        // REMOVED: attendance_sessions table no longer exists
        const openSession = null;
        /*
        const openSession = await tx.attendance_sessions.findFirst({
          where: {
            user_id: user_id,
            is_open: true,
            deleted_at: null,
          },
        });
        */

        if (openSession) {
          throw new BadRequestException(
            'Bạn đang có session làm việc mở. Vui lòng check-out trước khi check-in lại.',
          );
        }

        let timesheet = await tx.time_sheets.findFirst({
          where: {
            user_id: user_id,
            work_date: new Date(today),
            deleted_at: null,
          },
        });

        if (!timesheet) {
          // Check if today is a holiday
          const isHoliday = await tx.holidays.findFirst({
            where: {
              status: HolidayStatus.ACTIVE,
              deleted_at: null,
              start_date: { lte: new Date(today) },
              end_date: { gte: new Date(today) },
            },
          });

          timesheet = await tx.time_sheets.create({
            data: {
              user_id: user_id,
              work_date: new Date(today),
              status: 'PENDING',
              type: isHoliday ? 'HOLIDAY' : 'NORMAL',
              remote: checkinDto.remote || 'OFFICE',
            },
          });
        }

        const workStartTime = new Date(today);
        workStartTime.setHours(8, 30, 0, 0);
        const lateTime =
          checkin_time > workStartTime
            ? Math.floor(
                (checkin_time.getTime() - workStartTime.getTime()) /
                  (1000 * 60),
              )
            : 0;

        // REMOVED: attendance_sessions table no longer exists
        /*
        const newSession = await tx.attendance_sessions.create({
          data: {
            user_id: user_id,
            timesheet_id: timesheet.id,
            checkin_time: checkin_time,
            is_open: true,
            checkin_photo: checkinDto.photo_url || null,
            work_date: new Date(today),
            location_type: checkinDto.location_type || 'OFFICE',
            session_type: checkinDto.session_type || 'WORK',
          },
        });
        */
        const newSession = null;

        const attendanceLog = await tx.attendance_logs.create({
          data: {
            user_id: user_id,
            timesheet_id: timesheet.id,
            action_type: 'checkin',
            timestamp: checkin_time,
            work_date: new Date(today),
            location_type: checkinDto.location_type || 'OFFICE',
            photo_url: checkinDto.photo_url,
            itempodency_key: idempotencyKey,
            status: 'APPROVED',
          },
        });

        const updatedTimesheet = await tx.time_sheets.update({
          where: { id: timesheet.id },
          data: {
            checkin: checkin_time,
            // REMOVED: late_time
            remote: checkinDto.remote || 'OFFICE',
          },
        });

        return {
          timesheet: updatedTimesheet,
          attendance_log: attendanceLog,
          session: newSession,
          message: 'Check-in thành công',
          ip_validation: {
            client_ip: ip_validation.client_ip,
            is_office_network: ip_validation.is_office_network,
            has_approved_remote_request:
              ip_validation.has_approved_remote_request,
            validation_message: ip_validation.message,
          },
        };
      },
      {
        timeout: 30000, // 30 seconds timeout
      },
    );
  }

  async checkout(user_id: number, checkoutDto: CheckoutDto) {
    const today = new Date().toISOString().split('T')[0];
    const checkout_time = new Date();

    const client_ip = this.ip_validationService.getclient_ip(this.request);

    const ip_validation =
      await this.ip_validationService.validateIpForAttendance(
        user_id,
        client_ip,
        today,
      );

    if (!ip_validation.isValid) {
      throw new BadRequestException(ip_validation.message);
    }

    const idempotencyKey = `checkout_${user_id}_${today}`;

    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.users.findFirst({
          where: { id: user_id, deleted_at: null },
        });

        if (!user) {
          throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
        }

        if (!checkoutDto?.photo_url) {
          throw new BadRequestException('Thiếu photo_url sau khi xác thực ảnh');
        }

        const existingCheckin = await tx.attendance_logs.findFirst({
          where: {
            user_id: user_id,
            action_type: 'checkin',
            work_date: new Date(today),
            deleted_at: null,
          },
        });

        if (!existingCheckin) {
          throw new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_NOT_FOUND);
        }

        const existingCheckout = await tx.attendance_logs.findFirst({
          where: {
            user_id: user_id,
            action_type: 'checkout',
            work_date: new Date(today),
            deleted_at: null,
          },
        });

        if (existingCheckout) {
          throw new BadRequestException(
            TIMESHEET_ERRORS.TIMESHEET_ALREADY_SUBMITTED,
          );
        }

        // REMOVED: attendance_sessions table no longer exists
        const openSession = null;
        /*
        const openSession = await tx.attendance_sessions.findFirst({
          where: {
            user_id: user_id,
            work_date: new Date(today),
            is_open: true,
            deleted_at: null,
          },
        });
        */

        if (!openSession) {
          throw new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_NOT_FOUND);
        }

        const todayTimesheet = await tx.time_sheets.findFirst({
          where: {
            user_id: user_id,
            work_date: new Date(today),
            deleted_at: null,
          },
        });

        if (!todayTimesheet) {
          throw new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_NOT_FOUND);
        }

        if (!todayTimesheet.checkin) {
          throw new BadRequestException(TIMESHEET_ERRORS.INVALID_WORK_TIME);
        }

        const workEndTime = new Date(today);
        workEndTime.setHours(17, 30, 0, 0);
        const earlyTime =
          checkout_time < workEndTime
            ? Math.floor(
                (workEndTime.getTime() - checkout_time.getTime()) / (1000 * 60),
              )
            : 0;

        const total_work_minutes = Math.floor(
          (checkout_time.getTime() - todayTimesheet.checkin.getTime()) /
            (1000 * 60),
        );

        const breakTime = 60;
        const netWorkMinutes = Math.max(0, total_work_minutes - breakTime);

        const workTimeMorning = Math.min(240, netWorkMinutes);
        const workTimeAfternoon = Math.max(0, netWorkMinutes - 240);

        // REMOVED: attendance_sessions table no longer exists
        /*
        await tx.attendance_sessions.update({
          where: { id: openSession.id },
          data: {
            checkout_time: checkout_time,
            checkout_photo: checkoutDto.photo_url || null,
            is_open: false, // Đóng session khi checkout
          },
        });
        */

        const attendanceLog = await tx.attendance_logs.create({
          data: {
            user_id: user_id,
            timesheet_id: todayTimesheet.id,
            action_type: 'checkout',
            timestamp: checkout_time,
            work_date: new Date(today),
            location_type: checkoutDto.location_type || 'OFFICE',
            photo_url: checkoutDto.photo_url,
            itempodency_key: idempotencyKey,
            status: 'APPROVED',
          },
        });

        const updatedTimesheet = await tx.time_sheets.update({
          where: { id: todayTimesheet.id },
          data: {
            checkout: checkout_time,
            // REMOVED: early_time, work_time_morning/afternoon, break_time
            total_work_time: netWorkMinutes,
            is_complete: true,
          },
        });

        return {
          timesheet: updatedTimesheet,
          attendance_log: attendanceLog,
          session: openSession,
          work_summary: {
            total_minutes: total_work_minutes,
            net_work_minutes: netWorkMinutes,
            break_minutes: breakTime,
            morning_minutes: workTimeMorning,
            afternoon_minutes: workTimeAfternoon,
          },
          message: SUCCESS_MESSAGES.OPERATION_SUCCESSFUL,
          ip_validation: {
            client_ip: ip_validation.client_ip,
            is_office_network: ip_validation.is_office_network,
            has_approved_remote_request:
              ip_validation.has_approved_remote_request,
            validation_message: ip_validation.message,
          },
        };
      },
      {
        timeout: 30000, // 30 seconds timeout
      },
    );
  }

  async getTodayAttendance(user_id: number) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    return this.prisma.time_sheets.findFirst({
      where: {
        user_id: user_id,
        work_date: new Date(today),
        deleted_at: null,
      },
    });
  }

  /**
   * Kiểm tra xem ngày có nghỉ phép không và loại nghỉ phép
   */
  async getDayOffInfo(
    user_id: number,
    workDate: string,
  ): Promise<{
    hasDayOff: boolean;
    dayOff?: any;
    needsAttendance: boolean;
    expectedWorkHours: {
      morningHours: number;
      afternoonHours: number;
      totalHours: number;
    };
  }> {
    const targetDate = new Date(workDate);

    const dayOffRequests = await this.attendanceRequestService.findMany({
      user_id: user_id,
      work_date: targetDate,
      request_type: 'DAY_OFF',
      status: 'APPROVED',
      deleted_at: null,
    });
    const dayOff = dayOffRequests[0]?.day_off;

    if (!dayOff) {
      return {
        hasDayOff: false,
        needsAttendance: true,
        expectedWorkHours: {
          morningHours: 4 * 60, // 4 giờ = 240 phút
          afternoonHours: 4 * 60, // 4 giờ = 240 phút
          totalHours: 8 * 60, // 8 giờ = 480 phút
        },
      };
    }

    const workHours = DayOffCalculator.calculateWorkHours(
      dayOff.duration as DayOffDuration,
    );

    return {
      hasDayOff: true,
      dayOff,
      needsAttendance: DayOffCalculator.needsAttendance(
        dayOff.duration as DayOffDuration,
      ),
      expectedWorkHours: workHours,
    };
  }

  async createHoliday(createHolidayDto: CreateHolidayDto) {
    const holiday = await this.prisma.holidays.findFirst({
      where: { name: createHolidayDto.name, deleted_at: null },
    });
    if (holiday) {
      throw new BadRequestException('Ngày lễ đã tồn tại');
    }

    return this.prisma.holidays.create({
      data: {
        ...createHolidayDto,
        start_date: createHolidayDto.start_date
          ? new Date(createHolidayDto.start_date)
          : new Date(),
        end_date: createHolidayDto.end_date
          ? new Date(createHolidayDto.end_date)
          : new Date(),
        status: createHolidayDto.status,
      },
    });
  }

  async findAllHolidays(year?: string) {
    const where: Prisma.holidaysWhereInput = { deleted_at: null };

    if (year && !isNaN(Number(year)) && year.length === 4) {
      const yearNumber = Number(year);
      const yearStart = new Date(`${yearNumber}-01-01`);
      const yearEnd = new Date(`${yearNumber}-12-31`);
      if (
        isNaN(yearStart.getTime()) ||
        isNaN(yearEnd.getTime()) ||
        yearStart.getFullYear() !== yearNumber ||
        yearEnd.getFullYear() !== yearNumber
      ) {
        throw new BadRequestException('Năm không hợp lệ');
      }

      where.OR = [
        {
          start_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        {
          end_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        {
          AND: [
            { start_date: { lte: yearStart } },
            { end_date: { gte: yearEnd } },
          ],
        },
      ];
    }

    return this.prisma.holidays.findMany({
      where,
      orderBy: { start_date: 'asc' },
    });
  }

  async findAllHolidaysPaginated(paginationDto: HolidayPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.holidaysWhereInput = { deleted_at: null };

    if (paginationDto.year) {
      const yearStart = new Date(`${paginationDto.year}-01-01`);
      const yearEnd = new Date(`${paginationDto.year}-12-31`);

      where.OR = [
        {
          start_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        {
          end_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        {
          AND: [
            { start_date: { lte: yearStart } },
            { end_date: { gte: yearEnd } },
          ],
        },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.holidays.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { start_date: 'asc' },
      }),
      this.prisma.holidays.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async updateHoliday(id: number, updateHolidayDto: UpdateHolidayDto) {
    const holiday = await this.prisma.holidays.findFirst({
      where: { id, deleted_at: null },
    });

    if (!holiday) {
      throw new NotFoundException('Không tìm thấy ngày lễ');
    }

    return this.prisma.holidays.update({
      where: { id },
      data: {
        ...updateHolidayDto,
        start_date: updateHolidayDto.start_date
          ? new Date(updateHolidayDto.start_date)
          : undefined,
        end_date: updateHolidayDto.end_date
          ? new Date(updateHolidayDto.end_date)
          : undefined,
      },
    });
  }

  async removeHoliday(id: number) {
    const holiday = await this.prisma.holidays.findFirst({
      where: { id, deleted_at: null },
    });

    if (!holiday) {
      throw new NotFoundException('Không tìm thấy ngày lễ');
    }

    return this.prisma.holidays.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async getPersonalSchedule(user_id: number, getScheduleDto: GetScheduleDto) {
    const { start_date, end_date } = getScheduleDto;
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate =
      end_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        user_id: user_id,
        work_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        deleted_at: null,
      },
      orderBy: { work_date: 'asc' },
    });

    const dayOffRequests = await this.attendanceRequestService.findMany({
      user_id: user_id,
      request_type: 'DAY_OFF',
      status: 'APPROVED',
      deleted_at: null,
    });
    const dayOffs = dayOffRequests
      .map((r) => r.day_off)
      .filter((d): d is NonNullable<typeof d> => d !== null && d !== undefined);

    const overtimeRequests = await this.attendanceRequestService.findMany({
      user_id: user_id,
      request_type: 'OVERTIME',
      work_date: { gte: new Date(startDate), lte: new Date(endDate) },
      deleted_at: null,
    });
    const overtimes = overtimeRequests
      .map((r) => r.overtime)
      .filter((o): o is NonNullable<typeof o> => o !== null && o !== undefined);

    const holidays = await this.prisma.holidays.findMany({
      where: {
        start_date: {
          lte: new Date(endDate),
        },
        end_date: {
          gte: new Date(startDate),
        },
        status: HolidayStatus.ACTIVE,
        deleted_at: null,
      },
    });

    return {
      timesheets,
      dayOffs,
      overtimes,
      holidays,
    };
  }

  async getTeamSchedule(team_id: number, getScheduleDto: GetScheduleDto) {
    const { start_date, end_date } = getScheduleDto;
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate =
      end_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const teamAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: team_id,
        deleted_at: null,
      },
      select: { user_id: true },
      distinct: ['user_id'],
    });

    const user_ids = teamAssignments.map((assignment) => assignment.user_id);

    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        user_id: { in: user_ids },
        work_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        deleted_at: null,
      },
      orderBy: { work_date: 'asc' },
    });

    const dayOffRequests = await this.attendanceRequestService.findMany({
      user_id: { in: user_ids },
      request_type: 'DAY_OFF',
      status: ApprovalStatus.APPROVED,
      deleted_at: null,
    });
    const dayOffs = dayOffRequests
      .map((r) => r.day_off)
      .filter((d): d is NonNullable<typeof d> => d !== null && d !== undefined);

    const teamUsers = await this.prisma.users.findMany({
      where: { id: { in: user_ids }, deleted_at: null },
      select: {
        id: true,
        email: true,
        user_information: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Get holidays in period
    const holidays = await this.prisma.holidays.findMany({
      where: {
        status: HolidayStatus.ACTIVE,
        deleted_at: null,
        start_date: { lte: new Date(endDate) },
        end_date: { gte: new Date(startDate) },
      },
      orderBy: { start_date: 'asc' },
    });

    return {
      teamMembers: teamUsers,
      timesheets,
      dayOffs,
      holidays: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        start_date: h.start_date.toISOString().split('T')[0],
        end_date: h.end_date.toISOString().split('T')[0],
        description: h.description,
      })),
    };
  }

  async getTimesheetNotifications(user_id: number) {
    const today = new Date();
    const notifications: Array<{
      type: string;
      message: string;
      created_at: Date;
    }> = [];

    const todayCheckin = await this.getTodayAttendance(user_id);
    if (!todayCheckin) {
      notifications.push({
        type: 'warning',
        message: 'Bạn chưa check-in hôm nay',
        created_at: today,
      });
    } else if (!todayCheckin.checkout) {
      notifications.push({
        type: 'info',
        message: 'Đừng quên check-out khi kết thúc làm việc',
        created_at: today,
      });
    }

    const pendingDayOffs = await this.attendanceRequestService.count({
      user_id: user_id,
      request_type: 'DAY_OFF',
      status: ApprovalStatus.PENDING,
      deleted_at: null,
    });

    if (pendingDayOffs > 0) {
      notifications.push({
        type: 'info',
        message: `Bạn có ${pendingDayOffs} đơn nghỉ phép chờ duyệt`,
        created_at: today,
      });
    }

    const rejectedTimesheets = await this.prisma.time_sheets.count({
      where: {
        user_id: user_id,
        status: ApprovalStatus.REJECTED, // Từ chối
        deleted_at: null,
      },
    });

    if (rejectedTimesheets > 0) {
      notifications.push({
        type: 'error',
        message: `Bạn có ${rejectedTimesheets} timesheet bị từ chối, cần xem lại`,
        created_at: today,
      });
    }

    return notifications;
  }

  async getTimesheetReport(reportDto: TimesheetReportDto) {
    const { start_date, end_date, division_id, team_id } = reportDto;
    const startDate =
      start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    let user_ids: number[] = [];

    if (Number(team_id)) {
      const teamAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.TEAM,
          scope_id: Number(team_id),
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      user_ids = teamAssignments.map((assignment) => assignment.user_id);
    } else if (Number(division_id)) {
      const divisionAssignments =
        await this.prisma.user_role_assignment.findMany({
          where: {
            scope_type: ScopeType.DIVISION,
            scope_id: Number(division_id),
            deleted_at: null,
          },
          select: { user_id: true },
          distinct: ['user_id'],
        });
      user_ids = divisionAssignments.map((assignment) => assignment.user_id);
    }

    const where: any = {
      work_date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      deleted_at: null,
    };

    if (user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    const timesheets = await this.prisma.time_sheets.findMany({
      where,
      orderBy: { work_date: 'desc' },
    });

    if (user_ids.length > 0) {
      await this.prisma.users.findMany({
        where: { id: { in: user_ids } },
        select: {
          id: true,
          email: true,
        },
      });
    }

    // Get holidays in period
    const holidays = await this.prisma.holidays.findMany({
      where: {
        status: HolidayStatus.ACTIVE,
        deleted_at: null,
        OR: [
          {
            AND: [
              { start_date: { lte: new Date(endDate) } },
              { end_date: { gte: new Date(startDate) } },
            ],
          },
        ],
      },
      orderBy: { start_date: 'asc' },
    });

    const stats = {
      total_records: timesheets.length,
      total_late: 0, // REMOVED: late_time
      total_early_leave: 0, // REMOVED: early_time
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
      holidays: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        start_date: h.start_date.toISOString().split('T')[0],
        end_date: h.end_date.toISOString().split('T')[0],
        description: h.description,
      })),
    };
  }

  async getWorkingTimeReport(reportDto: WorkingTimeReportDto) {
    const { month, year, user_id } = reportDto;
    const currentDate = new Date();
    const reportYear =
      typeof year === 'string' ? Number(year) : currentDate.getFullYear();

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
    });

    const userStats = timesheets.reduce((acc: any, timesheet) => {
      const user_id = timesheet.user_id;
      if (!acc[user_id]) {
        acc[user_id] = {
          user_id: user_id,
          total_days: 0,
          total_work_hours: 0,
          total_late_minutes: 0,
          total_early_minutes: 0,
          days_remote: 0,
        };
      }

      acc[user_id].total_days += 1;
      acc[user_id].total_work_hours += (timesheet.total_work_time || 0) / 60;
      // REMOVED: late/early tracking
      acc[user_id].total_late_minutes += 0;
      acc[user_id].total_early_minutes += 0;
      acc[user_id].days_remote += timesheet.remote ? 1 : 0;

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

  async getAllUsersAttendanceStatistics(startDate?: string, endDate?: string) {
    const now = new Date();
    const defaultStartDate =
      startDate ||
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const defaultEndDate =
      endDate ||
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        work_date: {
          gte: new Date(defaultStartDate),
          lte: new Date(defaultEndDate),
        },
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { work_date: 'desc' },
    });

    const holidays = await this.prisma.holidays.findMany({
      where: {
        status: HolidayStatus.ACTIVE,
        deleted_at: null,
        OR: [
          {
            AND: [
              { start_date: { lte: new Date(defaultEndDate) } },
              { end_date: { gte: new Date(defaultStartDate) } },
            ],
          },
        ],
      },
      orderBy: { start_date: 'asc' },
    });

    const workingDaysInMonth = await this.calculateWorkingDaysInMonth(
      defaultStartDate,
      defaultEndDate,
    );

    const userStats = timesheets.reduce((acc: any, timesheet) => {
      const userId = timesheet.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          name: timesheet.user?.user_information?.name || 'N/A',
          email: timesheet.user?.email || 'N/A',
          total_days: 0,
          complete_days: 0,
          late_days: 0,
          late_minutes: 0,
          early_leave_days: 0,
          early_leave_minutes: 0,
          total_work_minutes: 0,
          full_day_off_count: 0,
        };
      }

      acc[userId].total_days += 1;
      if (timesheet.is_complete) acc[userId].complete_days += 1;
      // REMOVED: Late/early tracking
      if (timesheet.total_work_time) {
        acc[userId].total_work_minutes += timesheet.total_work_time;
      }
      // Note: day_off tracking removed - would need separate query if needed

      return acc;
    }, {});

    const employees = Object.values(userStats).map((stat: any) => {
      const expectedWorkDays = workingDaysInMonth - stat.full_day_off_count;
      const attendanceRate =
        expectedWorkDays > 0
          ? Math.round((stat.complete_days / expectedWorkDays) * 100)
          : 0;
      const punctualityRate =
        stat.total_days > 0
          ? Math.round(
              ((stat.total_days - stat.late_days - stat.early_leave_days) /
                stat.total_days) *
                100,
            )
          : 100;

      return {
        user_id: stat.user_id,
        name: stat.name,
        email: stat.email,
        work_days: `${stat.complete_days}/${expectedWorkDays}`,
        attendance_rate: attendanceRate,
        punctuality_rate: punctualityRate,
        late_count: stat.late_days,
        late_minutes: stat.late_minutes,
        early_leave_count: stat.early_leave_days,
        early_leave_minutes: stat.early_leave_minutes,
        total_work_hours: Math.round((stat.total_work_minutes / 60) * 10) / 10,
        status:
          attendanceRate >= 95 && punctualityRate >= 90
            ? 'good'
            : attendanceRate >= 85 && punctualityRate >= 80
              ? 'warning'
              : 'critical',
      };
    });

    const summary = {
      total_employees: employees.length,
      working_days_in_month: workingDaysInMonth,
      average_attendance_rate:
        employees.length > 0
          ? Math.round(
              employees.reduce((sum, e: any) => sum + e.attendance_rate, 0) /
                employees.length,
            )
          : 0,
      average_punctuality_rate:
        employees.length > 0
          ? Math.round(
              employees.reduce((sum, e: any) => sum + e.punctuality_rate, 0) /
                employees.length,
            )
          : 0,
      total_late_count: employees.reduce(
        (sum, e: any) => sum + e.late_count,
        0,
      ),
      total_late_minutes: employees.reduce(
        (sum, e: any) => sum + e.late_minutes,
        0,
      ),
      employees_with_good_status: employees.filter(
        (e: any) => e.status === 'good',
      ).length,
      employees_with_warning_status: employees.filter(
        (e: any) => e.status === 'warning',
      ).length,
      employees_with_critical_status: employees.filter(
        (e: any) => e.status === 'critical',
      ).length,
    };

    return {
      period: {
        start_date: defaultStartDate,
        end_date: defaultEndDate,
      },
      summary,
      employees: employees.sort(
        (a: any, b: any) => b.late_count - a.late_count,
      ),
      holidays: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        start_date: h.start_date.toISOString().split('T')[0],
        end_date: h.end_date.toISOString().split('T')[0],
        description: h.description,
      })),
    };
  }

  async getAttendanceStatistics(
    user_id?: number,
    startDate?: string,
    endDate?: string,
  ) {
    const now = new Date();
    const defaultStartDate =
      startDate ||
      new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
    const defaultEndDate =
      endDate ||
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

    const where: Prisma.time_sheetsWhereInput = {
      work_date: {
        gte: new Date(defaultStartDate),
        lte: new Date(defaultEndDate),
      },
      deleted_at: null,
    };

    if (user_id) {
      where.user_id = Number(user_id);
    }

    const timesheets = await this.prisma.time_sheets.findMany({
      where,
      orderBy: { work_date: 'desc' },
    });

    const whereAttendance: any = {
      work_date: {
        gte: new Date(defaultStartDate),
        lte: new Date(defaultEndDate),
      },
      status: 'APPROVED',
      deleted_at: null,
    };
    if (user_id) {
      whereAttendance.user_id = Number(user_id);
    }

    const overtimeRequests = await this.attendanceRequestService.findMany({
      ...whereAttendance,
      request_type: 'OVERTIME',
    });

    const dayOffRequests = await this.attendanceRequestService.findMany({
      ...whereAttendance,
      request_type: 'DAY_OFF',
    });

    let currentLeaveBalance: any = null;
    if (user_id) {
      currentLeaveBalance = await this.prisma.user_leave_balances.findUnique({
        where: { user_id: Number(user_id) },
      });
    }

    const totalDays = timesheets.length;
    const completeDays = timesheets.filter((t) => t.is_complete).length;
    // REMOVED: Late/early tracking
    const lateDays = 0;
    const earlyLeaveDays = 0;
    const totallate_minutes = 0;
    const totalearly_minutes = 0; // REMOVED

    const totalOvertimeHours = overtimeRequests.reduce(
      (sum, req) => sum + (req.overtime?.total_hours || 0),
      0,
    );
    const overtimeCount = overtimeRequests.length;

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    const startDateObj = new Date(defaultStartDate);
    const endDateObj = new Date(defaultEndDate);

    dayOffRequests.forEach((req) => {
      const dayOff = req.day_off;
      if (!dayOff) return;

      const leaveStart = new Date(
        Math.max(req.work_date.getTime(), startDateObj.getTime()),
      );
      const leaveEnd = new Date(
        Math.min(req.work_date.getTime(), endDateObj.getTime()),
      );

      if (leaveStart <= leaveEnd) {
        const leaveDaysInPeriod =
          Math.ceil(
            (leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24),
          ) + 1;
        const actualLeaveDays = dayOff.duration === 'FULL_DAY' ? 1 : 0.5;

        if (dayOff.type === 'PAID') {
          paidLeaveDays += actualLeaveDays;
        } else {
          unpaidLeaveDays += actualLeaveDays;
        }
      }
    });

    // Get holidays in period
    const holidays = await this.prisma.holidays.findMany({
      where: {
        status: HolidayStatus.ACTIVE,
        deleted_at: null,
        OR: [
          {
            AND: [
              { start_date: { lte: new Date(defaultEndDate) } },
              { end_date: { gte: new Date(defaultStartDate) } },
            ],
          },
        ],
      },
      orderBy: { start_date: 'asc' },
    });

    const workingDaysInMonth = await this.calculateWorkingDaysInMonth(
      defaultStartDate,
      defaultEndDate,
    );

    const fullDayOffCount = dayOffRequests.filter(
      (req) => req.day_off?.duration === 'FULL_DAY',
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
        paid_leave: paidLeaveDays, // Số ngày
        unpaid_leave: unpaidLeaveDays, // Số ngày
        total_leave_requests: dayOffRequests.length,
      },
      holidays: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        start_date: h.start_date.toISOString().split('T')[0],
        end_date: h.end_date.toISOString().split('T')[0],
        description: h.description,
      })),
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

  /**
   * Tính số ngày làm việc trong khoảng thời gian (trừ cuối tuần và holidays)
   */
  private async calculateWorkingDaysInMonth(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get holidays in the period
    const holidays = await this.prisma.holidays.findMany({
      where: {
        status: HolidayStatus.ACTIVE,
        deleted_at: null,
        OR: [
          {
            AND: [{ start_date: { lte: end } }, { end_date: { gte: start } }],
          },
        ],
      },
    });

    let workingDays = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
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
          workingDays++;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }
  async createAttendanceLog(
    createAttendanceLogDto: CreateAttendanceLogDto,
    currentuser_id: number,
  ) {
    if (createAttendanceLogDto.timesheet_id) {
      const timesheet = await this.prisma.time_sheets.findFirst({
        where: {
          id: createAttendanceLogDto.timesheet_id,
          deleted_at: null,
        },
      });

      if (!timesheet) {
        throw new NotFoundException('Không tìm thấy timesheet');
      }

      if (timesheet.user_id !== currentuser_id) {
        throw new BadRequestException(
          'Bạn không có quyền tạo log cho timesheet của user khác',
        );
      }
    }

    const workDate = new Date(createAttendanceLogDto.work_date);
    let timesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: createAttendanceLogDto.timesheet_id
          ? undefined
          : currentuser_id,
        work_date: workDate,
        deleted_at: null,
      },
    });

    if (!timesheet && !createAttendanceLogDto.timesheet_id) {
      timesheet = await this.createDailyTimesheet(
        currentuser_id,
        createAttendanceLogDto.work_date,
      );
    }

    if (
      timesheet &&
      workDate.toISOString().split('T')[0] !==
        (timesheet.work_date || new Date()).toISOString().split('T')[0]
    ) {
      throw new BadRequestException('Work_date không khớp với timesheet');
    }

    return this.prisma.attendance_logs.create({
      data: {
        ...createAttendanceLogDto,
        user_id: currentuser_id,
        timesheet_id: createAttendanceLogDto.timesheet_id || timesheet?.id,
        timestamp: new Date(createAttendanceLogDto.timestamp),
        work_date: workDate,
        is_manual: createAttendanceLogDto.is_manual || false,
        status: createAttendanceLogDto.status || ApprovalStatus.PENDING,
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
        timesheet: {
          select: { id: true, work_date: true },
        },
      },
    });
  }

  async getAttendanceLogs(
    currentuser_id: number,
    queryDto: AttendanceLogQueryDto,
    userRoles?: string[], // Thêm tham số roles để kiểm tra quyền
  ) {
    const {
      user_id,
      start_date,
      end_date,
      action_type,
      status,
      page = 1,
      limit = 20,
    } = queryDto;

    const where: any = { deleted_at: null };

    if (user_id && user_id !== currentuser_id) {
      const canViewOtherUsers = userRoles?.some((role) =>
        ['admin', 'hr', 'manager'].includes(role.toLowerCase()),
      );

      if (!canViewOtherUsers) {
        throw new BadRequestException(
          'Bạn không có quyền xem attendance log của user khác',
        );
      }

      where.user_id = user_id;
    } else {
      where.user_id = currentuser_id;
    }

    if (start_date && end_date) {
      where.work_date = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    }

    if (action_type) {
      where.action_type = action_type;
    }

    if (status !== undefined) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      this.prisma.attendance_logs.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true },
          },
          timesheet: {
            select: { id: true, work_date: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.attendance_logs.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getAttendanceLogsPaginated(
    currentuser_id: number,
    paginationDto: AttendanceLogPaginationDto,
    userRoles?: string[],
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = { deleted_at: null };

    if (paginationDto.user_id && paginationDto.user_id !== currentuser_id) {
      const canViewOtherUsers = userRoles?.some((role) =>
        ['admin', 'hr', 'manager'].includes(role.toLowerCase()),
      );

      if (!canViewOtherUsers) {
        throw new BadRequestException(
          'Bạn không có quyền xem attendance log của user khác',
        );
      }

      where.user_id = paginationDto.user_id;
    } else {
      where.user_id = currentuser_id;
    }

    if (paginationDto.start_date && paginationDto.end_date) {
      where.work_date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    if (paginationDto.log_type) {
      where.action_type = paginationDto.log_type;
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance_logs.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, email: true },
          },
          timesheet: {
            select: { id: true, work_date: true },
          },
        },
      }),
      this.prisma.attendance_logs.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getAttendanceLogById(id: number) {
    const log = await this.prisma.attendance_logs.findFirst({
      where: { id, deleted_at: null },
      include: {
        user: {
          select: { id: true, email: true },
        },
        timesheet: {
          select: { id: true, work_date: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Không tìm thấy log chấm công');
    }

    return log;
  }

  async updateAttendanceLog(
    id: number,
    updateAttendanceLogDto: UpdateAttendanceLogDto,
  ) {
    await this.getAttendanceLogById(id);

    return this.prisma.attendance_logs.update({
      where: { id, user_id: updateAttendanceLogDto.user_id },
      data: {
        ...updateAttendanceLogDto,
        status: updateAttendanceLogDto.status || ApprovalStatus.PENDING,
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
        timesheet: {
          select: { id: true, work_date: true },
        },
      },
    });
  }

  async deleteAttendanceLog(id: number) {
    await this.getAttendanceLogById(id);

    return this.prisma.attendance_logs.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async createDailyTimesheet(user_id: number, workDate?: string) {
    const targetDate = workDate ? new Date(workDate) : new Date();

    const existing = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: user_id,
        work_date: targetDate,
        deleted_at: null,
      },
    });

    if (existing) {
      throw new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS);
    }

    return this.prisma.time_sheets.create({
      data: {
        user_id: user_id,
        work_date: targetDate,
        status: 'PENDING',
        type: 'NORMAL',
      },
    });
  }

  /**
   * Submit timesheet để chờ duyệt
   */
  async submitTimesheet(id: number, user_id: number) {
    const timesheet = await this.findTimesheetById(id);

    if (timesheet.user_id !== user_id) {
      throw new BadRequestException('Bạn không có quyền submit timesheet này');
    }

    if (
      !ApprovalStatusManager.canTransition(
        timesheet.status || ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
      )
    ) {
      throw new BadRequestException(
        `Không thể submit timesheet từ trạng thái: ${ApprovalStatusManager.getStateName(timesheet.status || ApprovalStatus.PENDING)}`,
      );
    }

    return this.prisma.time_sheets.update({
      where: { id },
      data: { status: 'PENDING' },
    });
  }

  /**
   * Duyệt timesheet (chỉ manager/HR)
   */
  async approveTimesheet(id: number, _approverId: number) {
    const timesheet = await this.findTimesheetById(id);

    const currentState = timesheet.status || ApprovalStatus.PENDING;
    if (
      !ApprovalStatusManager.canTransition(
        currentState,
        ApprovalStatus.APPROVED,
      )
    ) {
      throw new BadRequestException(
        `Không thể duyệt timesheet từ trạng thái: ${ApprovalStatusManager.getStateName(currentState)}`,
      );
    }

    return this.prisma.time_sheets.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });
  }

  /**
   * Từ chối timesheet (chỉ manager/HR)
   */
  async rejectTimesheet(id: number, _rejectorId: number, _reason?: string) {
    const timesheet = await this.findTimesheetById(id);

    const currentState = timesheet.status || ApprovalStatus.PENDING;
    if (
      !ApprovalStatusManager.canTransition(
        currentState,
        ApprovalStatus.REJECTED,
      )
    ) {
      throw new BadRequestException(
        `Không thể từ chối timesheet từ trạng thái: ${ApprovalStatusManager.getStateName(currentState)}`,
      );
    }

    return this.prisma.time_sheets.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
    });
  }

  /**
   * Khóa timesheet sau khi tính lương (chỉ admin/HR)
   */
  async lockTimesheet(id: number, _lockerId: number) {
    const timesheet = await this.findTimesheetById(id);

    const currentState = timesheet.status || ApprovalStatus.PENDING;
    if (
      !ApprovalStatusManager.canTransition(
        currentState,
        ApprovalStatus.APPROVED,
      )
    ) {
      throw new BadRequestException(
        `Không thể khóa timesheet từ trạng thái: ${ApprovalStatusManager.getStateName(currentState)}`,
      );
    }

    return this.prisma.time_sheets.update({
      where: { id },
      data: {
        status: 'APPROVED',
      },
    });
  }

  private async getRequestsForDate(user_id: number, workDate: Date) {
    const dateStr = workDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    const [
      remoteWorkRequests,
      dayOffRequests,
      overtimeRequests,
      lateEarlyRequests,
      forgotCheckinRequests,
    ] = await Promise.all([
      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: new Date(dateStr),
        request_type: AttendanceRequestType.REMOTE_WORK,
        deleted_at: null,
      }),

      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: new Date(dateStr),
        request_type: AttendanceRequestType.DAY_OFF,
        deleted_at: null,
      }),

      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: new Date(dateStr),
        request_type: AttendanceRequestType.OVERTIME,
        deleted_at: null,
      }),

      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: new Date(dateStr),
        request_type: AttendanceRequestType.LATE_EARLY,
        deleted_at: null,
      }),

      this.attendanceRequestService.findMany({
        user_id: user_id,
        work_date: new Date(dateStr),
        request_type: AttendanceRequestType.FORGOT_CHECKIN,
        deleted_at: null,
      }),
    ]);

    const allRequests = [
      ...remoteWorkRequests.map((req) => ({
        ...req,
        type: req.request_type,
        request_type: AttendanceRequestType.REMOTE_WORK,
      })),
      ...dayOffRequests.map((req) => ({
        ...req,
        request_type: AttendanceRequestType.DAY_OFF,
      })),
      ...overtimeRequests.map((req) => ({
        ...req,
        duration_hours: req.overtime?.total_hours || 0, 
        request_type: AttendanceRequestType.OVERTIME,
        start_time: req.overtime?.start_time?.toTimeString().slice(0, 5),
        end_time: req.overtime?.end_time?.toTimeString().slice(0, 5),
      })),
      ...lateEarlyRequests.map((req) => ({
        ...req,
        type: req.request_type,
        request_type: AttendanceRequestType.LATE_EARLY,
      })),
      ...forgotCheckinRequests.map((req) => ({
        ...req,
        request_type: AttendanceRequestType.FORGOT_CHECKIN,
        checkin_time: req.forgot_checkin_request?.checkin_time?.toTimeString().slice(0, 5) || null,
        checkout_time: req.forgot_checkin_request?.checkout_time?.toTimeString().slice(0, 5) || null,
      })),
    ];

    return allRequests.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async getTimesheetsForApproval(queryDto: any) {
    const {
      user_id,
      month,
      division_id,
      team_id,
      status,
      page = 1,
      limit = 20,
    } = queryDto;

    const where: Prisma.time_sheetsWhereInput = {
      deleted_at: null,
      status: status || ApprovalStatus.PENDING,
    };

    if (user_id) {
      where.user_id = Number(user_id);
    }

    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(`${year}-${monthNum}-01`);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0);

      where.work_date = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (division_id || team_id) {
      const scopeType = division_id ? ScopeType.DIVISION : ScopeType.TEAM;
      const scopeId = division_id || team_id;

      const assignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: scopeType,
          scope_id: Number(scopeId),
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });

      const user_ids = assignments.map((a) => a.user_id);
      where.user_id = { in: user_ids };
    }

    const [timesheets, total] = await Promise.all([
      this.prisma.time_sheets.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { work_date: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.time_sheets.count({ where }),
    ]);

    return {
      data: timesheets,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async bulkReviewTimesheets(
    timesheet_ids: number[],
    action: 'APPROVE' | 'REJECT',
    reviewer_id: number,
    reason?: string,
  ) {
    if (action === 'REJECT' && !reason) {
      throw new BadRequestException(
        TIMESHEET_ERRORS.REASON_REQUIRED_FOR_REJECT,
      );
    }

    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        id: { in: timesheet_ids },
        deleted_at: null,
      },
    });

    if (timesheets.length !== timesheet_ids.length) {
      throw new NotFoundException(TIMESHEET_ERRORS.SOME_TIMESHEETS_NOT_FOUND);
    }

    const targetStatus =
      action === 'APPROVE' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

    const invalidTimesheets = timesheets.filter(
      (t) =>
        !ApprovalStatusManager.canTransition(
          t.status || ApprovalStatus.PENDING,
          targetStatus,
        ),
    );

    if (invalidTimesheets.length > 0) {
      throw new BadRequestException(
        `${TIMESHEET_ERRORS.CANNOT_REVIEW_INVALID_STATUS}: ${invalidTimesheets.length} timesheet`,
      );
    }

    const result = await this.prisma.time_sheets.updateMany({
      where: {
        id: { in: timesheet_ids },
      },
      data: {
        status: targetStatus,
      },
    });

    const actionText = action === 'APPROVE' ? 'duyệt' : 'từ chối';
    const countField =
      action === 'APPROVE' ? 'approved_count' : 'rejected_count';
    const idsField = action === 'APPROVE' ? 'approved_ids' : 'rejected_ids';

    return {
      success: true,
      action,
      message: `Đã ${actionText} ${result.count} timesheets thành công`,
      [countField]: result.count,
      [idsField]: timesheet_ids,
      reviewer_id: reviewer_id,
      ...(reason && { reason }),
    };
  }

  async getRequestQuota(user_id: number) {
    // Lấy quota từ user_leave_balances
    const leaveBalance = await this.prisma.user_leave_balances.findUnique({
      where: { user_id },
      select: {
        monthly_forgot_checkin_quota: true,
        monthly_late_early_quota: true,
        monthly_late_early_count_quota: true,
        last_reset_date: true,
      },
    });

    const forgotCheckinQuota = leaveBalance?.monthly_forgot_checkin_quota || 3;
    const lateEarlyMinutesQuota = leaveBalance?.monthly_late_early_quota || 120; // 120 phút
    const lateEarlyCountQuota =
      leaveBalance?.monthly_late_early_count_quota || 3; // 3 requests

    // Tính số request đã tạo trong tháng hiện tại
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Đếm số lượng forgot checkin requests (KHÔNG tính REJECTED)
    const forgotCheckinRequests = await this.attendanceRequestService.findMany({
      user_id,
      work_date: { gte: startOfMonth, lte: endOfMonth },
      request_type: 'FORGOT_CHECKIN',
      deleted_at: null,
    });
    const forgotCheckinCount = forgotCheckinRequests.filter(
      (r) => r.status !== 'REJECTED',
    ).length;

    // Tính TỔNG SỐ PHÚT và SỐ LƯỢNG late/early requests (KHÔNG tính REJECTED)
    const lateEarlyRequestsAll = await this.attendanceRequestService.findMany({
      user_id,
      work_date: { gte: startOfMonth, lte: endOfMonth },
      request_type: 'LATE_EARLY',
      deleted_at: null,
    });
    const lateEarlyRequests = lateEarlyRequestsAll.filter(
      (r) => r.status !== 'REJECTED',
    );

    const lateEarlyRequestCount = lateEarlyRequests.length; // Số lượng requests
    const totalLateEarlyMinutes = lateEarlyRequests.reduce((total, req) => {
      const detail = req.late_early_request;
      return total + (detail?.late_minutes || 0) + (detail?.early_minutes || 0);
    }, 0); // Tổng số phút

    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      forgot_checkin: {
        quota: forgotCheckinQuota,
        used: forgotCheckinCount,
        remaining: Math.max(0, forgotCheckinQuota - forgotCheckinCount),
        exceeded: forgotCheckinCount >= forgotCheckinQuota,
      },
      late_early: {
        count_quota: lateEarlyCountQuota, // 3 requests
        used_count: lateEarlyRequestCount, // Số requests đã tạo
        remaining_count: Math.max(
          0,
          lateEarlyCountQuota - lateEarlyRequestCount,
        ),
        count_exceeded: lateEarlyRequestCount >= lateEarlyCountQuota,

        minutes_quota: lateEarlyMinutesQuota, // 120 phút
        used_minutes: totalLateEarlyMinutes, // Tổng phút đã dùng
        remaining_minutes: Math.max(
          0,
          lateEarlyMinutesQuota - totalLateEarlyMinutes,
        ),
        minutes_exceeded: totalLateEarlyMinutes >= lateEarlyMinutesQuota,

        exceeded:
          lateEarlyRequestCount >= lateEarlyCountQuota ||
          totalLateEarlyMinutes >= lateEarlyMinutesQuota,
      },
      last_reset_date: leaveBalance?.last_reset_date || null,
    };
  }

  /**
   * Validate request quota trước khi tạo request
   * Throw BadRequestException nếu vượt quota
   */
  async validateRequestQuota(
    user_id: number,
    requestType: 'forgot_checkin' | 'late_early',
    requestMinutes?: number, // Số phút của request sắp tạo (cho late_early)
  ) {
    const quota = await this.getRequestQuota(user_id);

    if (requestType === 'forgot_checkin' && quota.forgot_checkin.exceeded) {
      throw new BadRequestException(
        `Bạn đã hết quota request quên chấm công cho tháng này (${quota.forgot_checkin.used}/${quota.forgot_checkin.quota} requests)`,
      );
    }

    if (requestType === 'late_early') {
      // Check 1: Số lượng requests
      if (quota.late_early.count_exceeded) {
        throw new BadRequestException(
          `Đã hết quota số lượng request đi muộn/về sớm cho tháng này (${quota.late_early.used_count}/${quota.late_early.count_quota} requests). Lưu ý: Các request bị reject không tính vào quota.`,
        );
      }

      // Check 2: Tổng số phút
      const totalMinutesAfterRequest =
        quota.late_early.used_minutes + (requestMinutes || 0);

      if (totalMinutesAfterRequest > quota.late_early.minutes_quota) {
        throw new BadRequestException(
          `Không đủ quota phút đi muộn/về sớm. Hiện có: ${quota.late_early.remaining_minutes} phút, cần: ${requestMinutes} phút (Đã dùng: ${quota.late_early.used_minutes}/${quota.late_early.minutes_quota} phút)`,
        );
      }
    }
  }

  /**
   * Lấy thông tin số phút đi muộn/về sớm còn lại của user trong tháng
   */
  async getLateEarlyBalance(user_id: number) {
    // Lấy quota từ user_leave_balances
    const leaveBalance = await this.prisma.user_leave_balances.findUnique({
      where: { user_id },
      select: {
        monthly_violation_minutes_quota: true,
        last_reset_date: true,
      },
    });

    const quota = leaveBalance?.monthly_violation_minutes_quota || 60; // Default 60 phút

    // Tính tổng phút muộn + sớm trong tháng hiện tại
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const summary = await this.prisma.time_sheets.aggregate({
      where: {
        user_id,
        work_date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        deleted_at: null,
      },
      _sum: {
        // REMOVED: late_time, early_time
        total_work_time: true,
      },
    });

    const usedLateMinutes = 0; // REMOVED
    const usedEarlyMinutes = 0; // REMOVED
    const totalUsedMinutes = usedLateMinutes + usedEarlyMinutes;

    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      quota: quota,
      used_minutes: totalUsedMinutes,
      used_late_minutes: usedLateMinutes,
      used_early_minutes: usedEarlyMinutes,
      remaining_minutes: Math.max(0, quota - totalUsedMinutes),
      exceeded: totalUsedMinutes > quota,
      exceeded_by: Math.max(0, totalUsedMinutes - quota),
      last_reset_date: leaveBalance?.last_reset_date || null,
    };
  }
}
