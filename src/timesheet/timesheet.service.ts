import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import {
  DayOffDuration,
  HolidayStatus,
  Prisma,
  ApprovalStatus,
  ScopeType,
} from '@prisma/client';
import FormData from 'form-data';
import {
  SUCCESS_MESSAGES,
  TIMESHEET_ERRORS,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import { IpValidationService } from '../common/services/ip-validation.service';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import {
  AttendanceLogQueryDto,
  CreateAttendanceLogDto,
  UpdateAttendanceLogDto,
} from './dto/attendance-log.dto';
import { CheckinDto, CheckoutDto } from './dto/checkin-checkout.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { FaceIdentifiedDto } from './dto/face-identified.dto';
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
    private ipValidationService: IpValidationService,
    @Inject(REQUEST) private request: Request,
  ) {}

  // === TIMESHEET MANAGEMENT ===

  async createTimesheet(
    createTimesheetDto: CreateTimesheetDto,
    userId: number,
  ) {
    // Kiểm tra user tồn tại
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    // Kiểm tra xem có day-off được duyệt cho ngày này không
    const approvedDayOff = await this.prisma.day_offs.findFirst({
      where: {
        user_id: userId,
        work_date: new Date(createTimesheetDto.work_date),
        status: ApprovalStatus.APPROVED,
        deleted_at: null,
      },
    });

    // Nếu có day-off được duyệt, cần kiểm tra xem có cần attendance không
    if (approvedDayOff) {
      const needsAttendance = DayOffCalculator.needsAttendance(
        approvedDayOff.duration as DayOffDuration,
      );

      if (!needsAttendance) {
        throw new BadRequestException(
          TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS,
        );
      }

      // Nếu là nghỉ nửa ngày, cho phép tạo timesheet nhưng link với day-off
      console.log(
        `Tạo timesheet cho nghỉ phép nửa ngày: ${approvedDayOff.duration}`,
      );
    }

    // Kiểm tra đã tồn tại timesheet cho ngày này chưa
    const existingTimesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: userId,
        work_date: new Date(createTimesheetDto.work_date),
        deleted_at: null,
      },
    });

    if (existingTimesheet) {
      throw new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS);
    }

    return this.prisma.time_sheets.create({
      data: {
        ...createTimesheetDto,
        user_id: userId,
        work_date: new Date(createTimesheetDto.work_date),
        checkin: createTimesheetDto.checkin
          ? new Date(createTimesheetDto.checkin)
          : null,
        checkout: createTimesheetDto.checkout
          ? new Date(createTimesheetDto.checkout)
          : null,
        is_complete: createTimesheetDto.is_complete ? true : false,
        status: 'PENDING',
        type: createTimesheetDto.type,
        remote: createTimesheetDto.remote,
        day_off_id: approvedDayOff?.id || null, // Link với day-off nếu có
      },
    });
  }

  async findAllTimesheets(
    userId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: Prisma.time_sheetsWhereInput = {
      user_id: userId,
      deleted_at: null,
    };

    // Sử dụng work_date thay vì checkin để lọc
    if (startDate && endDate) {
      Object.assign(where, QueryUtil.workDateRange(startDate, endDate));
    }

    return this.prisma.time_sheets.findMany({
      where,
      orderBy: { work_date: 'desc' }, // Sắp xếp theo work_date thay vì checkin
    });
  }

  async findMyTimesheetsPaginated(
    userId: number,
    paginationDto: TimesheetPaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.time_sheetsWhereInput = {
      user_id: userId,
      deleted_at: null,
    };

    // Thêm filter theo ngày
    if (paginationDto.start_date && paginationDto.end_date) {
      Object.assign(
        where,
        QueryUtil.workDateRange(
          paginationDto.start_date,
          paginationDto.end_date,
        ),
      );
    }

    // Thêm filter theo status
    if (paginationDto.status) {
      where.status = paginationDto.status;
    }

    // Lấy dữ liệu và đếm tổng
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

    // Thêm requests cho mỗi timesheet
    const enhancedData = await Promise.all(
      data.map(async (timesheet) => {
        const requests = await this.getRequestsForDate(
          userId,
          timesheet.work_date,
        );
        return {
          ...timesheet,
          requests,
        };
      }),
    );

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

    // Kiểm tra xem timesheet có thể chỉnh sửa không
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

    // Kiểm tra xem timesheet có thể xóa không
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

  // === CHECK-IN/CHECK-OUT ===

  async registerFace(userId: number, image: Express.Multer.File) {
    if (image) {
      try {
        // Tạo form-data
        const formData = new FormData();
        formData.append('image', image.buffer, {
          filename: image.originalname,
          contentType: image.mimetype,
        } as any);
        formData.append('user_id', userId.toString());

        // Gửi request
        const response = await this.httpService.axiosRef.post(
          process.env.FACE_IDENTIFICATION_URL + '/add_user',
          formData,
          { headers: formData.getHeaders() },
        );

        return response.data;
      } catch (error) {
        console.error(error);
        throw new BadRequestException(
          error.response?.data?.error || 'Đăng ký khuôn mặt không thành công',
        );
      }
    } else {
      throw new BadRequestException('Ảnh khuôn mặt là bắt buộc');
    }
  }

  async checkin(
    userId: number,
    checkinDto: CheckinDto,
  ) {
    const today = new Date().toISOString().split('T')[0];
    const checkinTime = new Date();

    // Lấy IP của client
    const clientIp = this.ipValidationService.getClientIp(this.request);
    
    // Kiểm tra IP validation
    const ipValidation = await this.ipValidationService.validateIpForAttendance(
      userId,
      clientIp,
      today,
    );

    if (!ipValidation.isValid) {
      throw new BadRequestException(ipValidation.message);
    }

    const idempotencyKey = `checkin_${userId}_${today}`;

    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.users.findFirst({
          where: { id: userId, deleted_at: null },
        });

        if (!user) {
          throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
        }

        // FE must verify face and upload image, then pass photo_url here
        if (!checkinDto?.photo_url) {
          throw new BadRequestException('Thiếu photo_url sau khi xác thực ảnh');
        }

        const existingCheckin = await tx.attendance_logs.findFirst({
          where: {
            user_id: userId,
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

        // Kiểm tra session đang mở
        const openSession = await tx.attendance_sessions.findFirst({
          where: {
            user_id: userId,
            is_open: true,
            deleted_at: null,
          },
        });

        if (openSession) {
          throw new BadRequestException(
            'Bạn đang có session làm việc mở. Vui lòng check-out trước khi check-in lại.',
          );
        }

        // Tìm hoặc tạo timesheet cho hôm nay
        let timesheet = await tx.time_sheets.findFirst({
          where: {
            user_id: userId,
            work_date: new Date(today),
            deleted_at: null,
          },
        });

        if (!timesheet) {
          timesheet = await tx.time_sheets.create({
            data: {
              user_id: userId,
              work_date: new Date(today),
              status: 'PENDING',
              type: 'NORMAL',
              remote: checkinDto.remote || 'OFFICE',
            },
          });
        }

        // Tính toán late time (8:30 AM UTC+7 = 1:30 AM UTC)
        const workStartTime = new Date(today + 'T01:30:00.000Z');
        const lateTime =
          checkinTime > workStartTime
            ? Math.floor(
                (checkinTime.getTime() - workStartTime.getTime()) / (1000 * 60),
              )
            : 0;

        // Tạo session mới
        const newSession = await tx.attendance_sessions.create({
          data: {
            user_id: userId,
            timesheet_id: timesheet.id,
            checkin_time: checkinTime,
            is_open: true,
            checkin_photo: checkinDto.photo_url || null,
            work_date: new Date(today),
            location_type: checkinDto.location_type || 'OFFICE',
            session_type: checkinDto.session_type || 'WORK',
          },
        });

        // Tạo attendance log
        const attendanceLog = await tx.attendance_logs.create({
          data: {
            user_id: userId,
            timesheet_id: timesheet.id,
            action_type: 'checkin',
            timestamp: checkinTime,
            work_date: new Date(today),
            location_type: checkinDto.location_type || 'OFFICE',
            photo_url: checkinDto.photo_url,
            itempodency_key: idempotencyKey,
            status: 'APPROVED',
          },
        });

        // Cập nhật timesheet với thông tin check-in
        const updatedTimesheet = await tx.time_sheets.update({
          where: { id: timesheet.id },
          data: {
            checkin: checkinTime,
            late_time: lateTime,
            remote: checkinDto.remote || 'OFFICE',
          },
        });

        return {
          timesheet: updatedTimesheet,
          attendance_log: attendanceLog,
          session: newSession,
          message: 'Check-in thành công',
          ipValidation: {
            clientIp: ipValidation.clientIp,
            isOfficeNetwork: ipValidation.isOfficeNetwork,
            hasApprovedRemoteRequest: ipValidation.hasApprovedRemoteRequest,
            validationMessage: ipValidation.message,
          },
        };
      },
      {
        timeout: 30000, // 30 seconds timeout
      },
    );
  }

  async checkout(
    userId: number,
    checkoutDto: CheckoutDto,
  ) {
    const today = new Date().toISOString().split('T')[0];
    const checkoutTime = new Date();

    // Lấy IP của client
    const clientIp = this.ipValidationService.getClientIp(this.request);
    
    // Kiểm tra IP validation
    const ipValidation = await this.ipValidationService.validateIpForAttendance(
      userId,
      clientIp,
      today,
    );

    if (!ipValidation.isValid) {
      throw new BadRequestException(ipValidation.message);
    }

    // Tạo idempotency key dựa trên user_id và ngày (không dùng timestamp để tránh duplicate)
    const idempotencyKey = `checkout_${userId}_${today}`;

    return this.prisma.$transaction(
      async (tx) => {
        // Kiểm tra user tồn tại
        const user = await tx.users.findFirst({
          where: { id: userId, deleted_at: null },
        });

        if (!user) {
          throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
        }

        // FE must verify face and upload image, then pass photo_url here
        if (!checkoutDto?.photo_url) {
          throw new BadRequestException('Thiếu photo_url sau khi xác thực ảnh');
        }

        // Kiểm tra đã check-in hôm nay chưa
        const existingCheckin = await tx.attendance_logs.findFirst({
          where: {
            user_id: userId,
            action_type: 'checkin',
            work_date: new Date(today),
            deleted_at: null,
          },
        });

        if (!existingCheckin) {
          throw new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_NOT_FOUND);
        }

        // Kiểm tra đã check-out chưa
        const existingCheckout = await tx.attendance_logs.findFirst({
          where: {
            user_id: userId,
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

        // Tìm session đang mở để checkout
        const openSession = await tx.attendance_sessions.findFirst({
          where: {
            user_id: userId,
            work_date: new Date(today),
            is_open: true,
            deleted_at: null,
          },
        });

        if (!openSession) {
          throw new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_NOT_FOUND);
        }

        // Tìm timesheet hôm nay
        const todayTimesheet = await tx.time_sheets.findFirst({
          where: {
            user_id: userId,
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

        // Tính toán thời gian làm việc
        const workEndTime = new Date(today + 'T10:30:00.000Z'); // 5:30 PM UTC+7 = 10:30 AM UTC
        const earlyTime =
          checkoutTime < workEndTime
            ? Math.floor(
                (workEndTime.getTime() - checkoutTime.getTime()) / (1000 * 60),
              )
            : 0;

        // Tính tổng thời gian làm việc (phút)
        const totalWorkMinutes = Math.floor(
          (checkoutTime.getTime() - todayTimesheet.checkin.getTime()) /
            (1000 * 60),
        );

        // Trừ thời gian nghỉ trưa (60 phút mặc định)
        const breakTime = 60;
        const netWorkMinutes = Math.max(0, totalWorkMinutes - breakTime);

        // Phân chia thời gian sáng/chiều (4 giờ sáng = 240 phút)
        const workTimeMorning = Math.min(240, netWorkMinutes);
        const workTimeAfternoon = Math.max(0, netWorkMinutes - 240);

        // Cập nhật session với thông tin checkout
        await tx.attendance_sessions.update({
          where: { id: openSession.id },
          data: {
            checkout_time: checkoutTime,
            checkout_photo: checkoutDto.photo_url || null,
            is_open: false, // Đóng session khi checkout
          },
        });

        // Tạo attendance log
        const attendanceLog = await tx.attendance_logs.create({
          data: {
            user_id: userId,
            timesheet_id: todayTimesheet.id,
            action_type: 'checkout',
            timestamp: checkoutTime,
            work_date: new Date(today),
            location_type: checkoutDto.location_type || 'OFFICE',
            photo_url: checkoutDto.photo_url,
            itempodency_key: idempotencyKey,
            status: 'APPROVED',
          },
        });

        // Cập nhật timesheet với thông tin checkout và thời gian làm việc
        const updatedTimesheet = await tx.time_sheets.update({
          where: { id: todayTimesheet.id },
          data: {
            checkout: checkoutTime,
            early_time: earlyTime,
            work_time_morning: workTimeMorning,
            work_time_afternoon: workTimeAfternoon,
            total_work_time: workTimeMorning + workTimeAfternoon,
            break_time: breakTime,
            is_complete: true,
          },
        });

        return {
          timesheet: updatedTimesheet,
          attendance_log: attendanceLog,
          session: openSession,
          work_summary: {
            total_minutes: totalWorkMinutes,
            net_work_minutes: netWorkMinutes,
            break_minutes: breakTime,
            morning_minutes: workTimeMorning,
            afternoon_minutes: workTimeAfternoon,
          },
          message: SUCCESS_MESSAGES.OPERATION_SUCCESSFUL,
          ipValidation: {
            clientIp: ipValidation.clientIp,
            isOfficeNetwork: ipValidation.isOfficeNetwork,
            hasApprovedRemoteRequest: ipValidation.hasApprovedRemoteRequest,
            validationMessage: ipValidation.message,
          },
        };
      },
      {
        timeout: 30000, // 30 seconds timeout
      },
    );
  }

  async getTodayAttendance(userId: number) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    return this.prisma.time_sheets.findFirst({
      where: {
        user_id: userId,
        work_date: new Date(today),
        deleted_at: null,
      },
    });
  }

  /**
   * Kiểm tra xem ngày có nghỉ phép không và loại nghỉ phép
   */
  async getDayOffInfo(
    userId: number,
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

    const dayOff = await this.prisma.day_offs.findFirst({
      where: {
        user_id: userId,
        work_date: targetDate,
        status: 'APPROVED',
        deleted_at: null,
      },
    });

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

  // === OVERTIME INFO (Read-only methods) ===
  // Note: Overtime request creation/management moved to /requests module

  // === HOLIDAYS MANAGEMENT ===

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
      // Lấy tất cả holiday giao cắt với năm X (kể cả kỳ lễ kéo dài qua năm)
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
        // Holiday bắt đầu trong năm
        {
          start_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        // Holiday kết thúc trong năm
        {
          end_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        // Holiday bao trùm cả năm
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
      // Lấy tất cả holiday giao cắt với năm X (kể cả kỳ lễ kéo dài qua năm)
      const yearStart = new Date(`${paginationDto.year}-01-01`);
      const yearEnd = new Date(`${paginationDto.year}-12-31`);

      where.OR = [
        // Holiday bắt đầu trong năm
        {
          start_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        // Holiday kết thúc trong năm
        {
          end_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        // Holiday bao trùm cả năm
        {
          AND: [
            { start_date: { lte: yearStart } },
            { end_date: { gte: yearEnd } },
          ],
        },
      ];
    }
    // Lấy dữ liệu và đếm tổng
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

  // === SCHEDULE MANAGEMENT ===

  async getPersonalSchedule(userId: number, getScheduleDto: GetScheduleDto) {
    const { start_date, end_date } = getScheduleDto;
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate =
      end_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    // Lấy timesheet - sử dụng work_date thay vì checkin
    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        user_id: userId,
        work_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        deleted_at: null,
      },
      orderBy: { work_date: 'asc' },
    });

    // Lấy ngày nghỉ phép
    const dayOffs = await this.prisma.day_offs.findMany({
      where: {
        user_id: userId,
        status: 'APPROVED',
        deleted_at: null,
      },
    });

    // Lấy lịch làm thêm giờ
    const overtimes = await this.prisma.over_times_history.findMany({
      where: {
        user_id: userId,
        work_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        deleted_at: null,
      },
      orderBy: { work_date: 'asc' },
    });

    // Lấy ngày lễ
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

  async getTeamSchedule(teamId: number, getScheduleDto: GetScheduleDto) {
    const { start_date, end_date } = getScheduleDto;
    const startDate = start_date || new Date().toISOString().split('T')[0];
    const endDate =
      end_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    // Lấy danh sách thành viên team từ user_role_assignment
    const teamAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: teamId,
        deleted_at: null,
      },
      select: { user_id: true },
      distinct: ['user_id'],
    });

    const userIds = teamAssignments.map((assignment) => assignment.user_id);

    // Lấy timesheet của tất cả thành viên - sử dụng work_date
    const timesheets = await this.prisma.time_sheets.findMany({
      where: {
        user_id: { in: userIds },
        work_date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        deleted_at: null,
      },
      orderBy: { work_date: 'asc' },
    });

    // Lấy ngày nghỉ phép của team
    const dayOffs = await this.prisma.day_offs.findMany({
      where: {
        user_id: { in: userIds },
        status: ApprovalStatus.APPROVED, // Đã duyệt
        deleted_at: null,
      },
    });

    // Lấy user info cho team members
    const teamUsers = await this.prisma.users.findMany({
      where: { id: { in: userIds }, deleted_at: null },
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

    return {
      teamMembers: teamUsers,
      timesheets,
      dayOffs,
    };
  }

  // === NOTIFICATIONS ===

  async getTimesheetNotifications(userId: number) {
    const today = new Date();
    const notifications: Array<{
      type: string;
      message: string;
      created_at: Date;
    }> = [];

    const todayCheckin = await this.getTodayAttendance(userId);
    if (!todayCheckin) {
      notifications.push({
        type: 'warning',
        message: 'Bạn chưa check-in hôm nay',
        created_at: today,
      });
    } else if (!todayCheckin.checkout) {
      // Kiểm tra checkout == null thay vì sentinel date
      notifications.push({
        type: 'info',
        message: 'Đừng quên check-out khi kết thúc làm việc',
        created_at: today,
      });
    }

    // Kiểm tra đơn nghỉ phép chờ duyệt
    const pendingDayOffs = await this.prisma.day_offs.count({
      where: {
        user_id: userId,
        status: ApprovalStatus.PENDING, // Chờ duyệt
        deleted_at: null,
      },
    });

    if (pendingDayOffs > 0) {
      notifications.push({
        type: 'info',
        message: `Bạn có ${pendingDayOffs} đơn nghỉ phép chờ duyệt`,
        created_at: today,
      });
    }

    // Kiểm tra timesheet bị từ chối
    const rejectedTimesheets = await this.prisma.time_sheets.count({
      where: {
        user_id: userId,
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

  // === REPORTS & STATISTICS ===

  async getTimesheetReport(reportDto: TimesheetReportDto) {
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
          scope_type: ScopeType.TEAM,
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
          scope_type: ScopeType.DIVISION,
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
    });

    // Lấy thông tin user nếu có userIds
    if (userIds.length > 0) {
      await this.prisma.users.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
        },
      });
    }

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
        60, // Convert minutes to hours
    };

    return {
      timesheets,
      stats,
      period: { start_date: startDate, end_date: endDate },
    };
  }

  async getWorkingTimeReport(reportDto: WorkingTimeReportDto) {
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

    // Group by user
    const userStats = timesheets.reduce((acc: any, timesheet) => {
      const userId = timesheet.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
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
      acc[userId].days_remote += timesheet.remote ? 1 : 0;

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

  async getAttendanceStatistics(
    userId?: number,
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

    if (userId) {
      where.user_id = Number(userId);
    }

    const timesheets = await this.prisma.time_sheets.findMany({
      where,
      include: {
        day_off: {
          select: {
            type: true,
            duration: true,
            status: true,
          },
        },
      },
      orderBy: { work_date: 'desc' },
    });

    const overtimeRequests = await this.prisma.over_times_history.findMany({
      where: {
        ...(userId && { user_id: Number(userId) }),
        work_date: {
          gte: new Date(defaultStartDate),
          lte: new Date(defaultEndDate),
        },
        status: 'APPROVED',
        deleted_at: null,
      },
    });

    const dayOffRequests = await this.prisma.day_offs.findMany({
      where: {
        ...(userId && { user_id: Number(userId) }),
        work_date: {
          gte: new Date(defaultStartDate),
          lte: new Date(defaultEndDate),
        },
        status: 'APPROVED',
        deleted_at: null,
      },
    });

    let currentLeaveBalance: any = null;
    if (userId) {
      currentLeaveBalance = await this.prisma.user_leave_balances.findUnique({
        where: { user_id: Number(userId) },
      });
    }

    const totalDays = timesheets.length;
    const completeDays = timesheets.filter((t) => t.is_complete).length;
    const lateDays = timesheets.filter(
      (t) => t.late_time && t.late_time > 0,
    ).length;
    const earlyLeaveDays = timesheets.filter(
      (t) => t.early_time && t.early_time > 0,
    ).length;
    const totalLateMinutes = timesheets.reduce(
      (sum, t) => sum + (t.late_time || 0),
      0,
    );
    const totalEarlyMinutes = timesheets.reduce(
      (sum, t) => sum + (t.early_time || 0),
      0,
    );

    const totalOvertimeHours = overtimeRequests.reduce(
      (sum, ot) => sum + (ot.total_hours || 0),
      0,
    );
    const overtimeCount = overtimeRequests.length;

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

    const workingDaysInMonth = this.calculateWorkingDaysInMonth(
      defaultStartDate,
      defaultEndDate,
    );

    const fullDayOffCount = timesheets.filter(
      (t) => t.day_off && t.day_off.duration === 'FULL_DAY',
    ).length;
    const expectedWorkDays = workingDaysInMonth - fullDayOffCount;

    return {
      period: {
        start_date: defaultStartDate,
        end_date: defaultEndDate,
      },
      total_work_days: `${completeDays}/${expectedWorkDays}`,
      overtime_hours: totalOvertimeHours,
      late_minutes: totalLateMinutes,
      violation_time: `${lateDays + earlyLeaveDays}/${totalDays}`,
      paid_leave_hours: paidLeaveDays * 8, 
      unpaid_leave_hours: unpaidLeaveDays * 8, 

      attendance: {
        total_days: `${completeDays}/${expectedWorkDays}`,
        complete_days: completeDays,
        working_days_in_month: workingDaysInMonth,
        late: totalLateMinutes,
        late_days: lateDays,
        early_leave: `${earlyLeaveDays}/${totalDays}`,
        early_leave_days: earlyLeaveDays,
        early_leave_minutes: totalEarlyMinutes,
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
   * Tính số ngày làm việc trong khoảng thời gian (trừ cuối tuần)
   */
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
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }
  // === ATTENDANCE LOGS MANAGEMENT ===

  async createAttendanceLog(
    createAttendanceLogDto: CreateAttendanceLogDto,
    currentUserId: number,
  ) {
    // Kiểm tra nếu có timesheet_id, đảm bảo nó thuộc về user hiện tại
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

      // Chỉ cho phép tạo log cho timesheet của mình (trừ admin/HR)
      if (timesheet.user_id !== currentUserId) {
        throw new BadRequestException(
          'Bạn không có quyền tạo log cho timesheet của user khác',
        );
      }
    }

    // Tìm hoặc tạo timesheet cho ngày làm việc
    const workDate = new Date(createAttendanceLogDto.work_date);
    let timesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: createAttendanceLogDto.timesheet_id
          ? undefined
          : currentUserId,
        work_date: workDate,
        deleted_at: null,
      },
    });

    if (!timesheet && !createAttendanceLogDto.timesheet_id) {
      // Tạo timesheet mới nếu chưa tồn tại
      timesheet = await this.createDailyTimesheet(
        currentUserId,
        createAttendanceLogDto.work_date,
      );
    }

    // Đảm bảo work_date khớp với timesheet
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
        user_id: currentUserId,
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
    currentUserId: number,
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

    // Chỉ admin/manager mới được xem log của user khác
    if (user_id && user_id !== currentUserId) {
      // Kiểm tra quyền truy cập
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
      where.user_id = currentUserId;
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
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAttendanceLogsPaginated(
    currentUserId: number,
    paginationDto: AttendanceLogPaginationDto,
    userRoles?: string[],
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = { deleted_at: null };

    // Chỉ admin/manager mới được xem log của user khác
    if (paginationDto.user_id && paginationDto.user_id !== currentUserId) {
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
      where.user_id = currentUserId;
    }

    // Thêm filter theo ngày
    if (paginationDto.start_date && paginationDto.end_date) {
      where.work_date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    // Thêm filter theo log_type
    if (paginationDto.log_type) {
      where.action_type = paginationDto.log_type;
    }

    // Lấy dữ liệu và đếm tổng
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
      where: { id, user_id: updateAttendanceLogDto.userId },
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

  // === DAILY TIMESHEET CREATION ===

  async createDailyTimesheet(userId: number, workDate?: string) {
    const targetDate = workDate ? new Date(workDate) : new Date();

    // Kiểm tra đã tồn tại chưa
    const existing = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: userId,
        work_date: targetDate,
        deleted_at: null,
      },
    });

    if (existing) {
      throw new BadRequestException(TIMESHEET_ERRORS.TIMESHEET_ALREADY_EXISTS);
    }

    return this.prisma.time_sheets.create({
      data: {
        user_id: userId,
        work_date: targetDate,
        status: 'PENDING',
        type: 'NORMAL',
      },
    });
  }

  // === TIMESHEET STATE MANAGEMENT ===

  /**
   * Submit timesheet để chờ duyệt
   */
  async submitTimesheet(id: number, userId: number) {
    const timesheet = await this.findTimesheetById(id);

    // Kiểm tra quyền sở hữu
    if (timesheet.user_id !== userId) {
      throw new BadRequestException('Bạn không có quyền submit timesheet này');
    }

    // Kiểm tra có thể chuyển trạng thái không
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
        // Có thể thêm trường approved_by: approverId nếu cần
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
        // Có thể thêm trường rejected_by: rejectorId, reject_reason: reason nếu cần
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
        status: 'APPROVED', // LOCKED maps to APPROVED in new schema
        // Có thể thêm trường locked_by: lockerId, locked_at: new Date() nếu cần
      },
    });
  }

  /**
   * Lấy danh sách requests trong ngày cụ thể
   */
  private async getRequestsForDate(userId: number, workDate: Date) {
    const dateStr = workDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Lấy tất cả các loại requests trong ngày đó
    const [
      remoteWorkRequests,
      dayOffRequests,
      overtimeRequests,
      lateEarlyRequests,
      forgotCheckinRequests,
    ] = await Promise.all([
      // Remote work requests
      this.prisma.remote_work_requests.findMany({
        where: {
          user_id: userId,
          work_date: new Date(dateStr),
          deleted_at: null,
        },
        select: {
          id: true,
          remote_type: true,
          status: true,
          reason: true,
          created_at: true,
          approved_at: true,
          approved_by: true,
        },
      }),

      // Day off requests
      this.prisma.day_offs.findMany({
        where: {
          user_id: userId,
          work_date: new Date(dateStr),
          deleted_at: null,
        },
        select: {
          id: true,
          type: true,
          status: true,
          reason: true,
          duration: true,
          work_date: true,
          created_at: true,
          approved_at: true,
          approved_by: true,
        },
      }),

      // Overtime requests
      this.prisma.over_times_history.findMany({
        where: {
          user_id: userId,
          work_date: new Date(dateStr),
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
          reason: true,
          start_time: true,
          end_time: true,
          total_hours: true,
          created_at: true,
          approved_at: true,
          approved_by: true,
        },
      }),

      // Late/Early requests
      this.prisma.late_early_requests.findMany({
        where: {
          user_id: userId,
          work_date: new Date(dateStr),
          deleted_at: null,
        },
        select: {
          id: true,
          request_type: true,
          status: true,
          reason: true,
          late_minutes: true,
          early_minutes: true,
          created_at: true,
          approved_at: true,
          approved_by: true,
        },
      }),

      // Forgot checkin requests
      this.prisma.forgot_checkin_requests.findMany({
        where: {
          user_id: userId,
          work_date: new Date(dateStr),
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
          reason: true,
          checkin_time: true,
          checkout_time: true,
          created_at: true,
          approved_at: true,
          approved_by: true,
        },
      }),
    ]);

    // Combine và format tất cả requests với type identifier
    const allRequests = [
      ...remoteWorkRequests.map((req) => ({
        ...req,
        type: req.remote_type, // Map remote_type to type for consistency
        request_type: 'remote_work' as const,
      })),
      ...dayOffRequests.map((req) => ({
        ...req,
        request_type: 'day_off' as const,
      })),
      ...overtimeRequests.map((req) => ({
        ...req,
        duration_hours: req.total_hours, // Map total_hours to duration_hours for consistency
        request_type: 'overtime' as const,
        // Format time fields
        start_time: req.start_time?.toTimeString().slice(0, 5),
        end_time: req.end_time?.toTimeString().slice(0, 5),
      })),
      ...lateEarlyRequests.map((req) => ({
        ...req,
        type: req.request_type, // Map request_type to type for consistency
        request_type: 'late_early' as const,
      })),
      ...forgotCheckinRequests.map((req) => ({
        ...req,
        request_type: 'forgot_checkin' as const,
        // Format time fields
        checkin_time: req.checkin_time?.toTimeString().slice(0, 5) || null,
        checkout_time: req.checkout_time?.toTimeString().slice(0, 5) || null,
      })),
    ];

    // Sort by created_at desc
    return allRequests.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
}
