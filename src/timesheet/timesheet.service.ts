import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DayOffDuration,
  DayOffStatus,
  DayOffType,
  HolidayStatus,
  Prisma,
  TimesheetStatus,
} from '@prisma/client';
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
import { CreateDayOffRequestDto } from './dto/create-day-off-request.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { CreateOvertimeRequestDto } from './dto/create-overtime-request.dto';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { GetScheduleDto } from './dto/get-schedule.dto';
import {
  AttendanceLogPaginationDto,
  DayOffRequestPaginationDto,
  HolidayPaginationDto,
  OvertimeRequestPaginationDto,
  TimesheetPaginationDto,
} from './dto/pagination-queries.dto';
import {
  TimesheetReportDto,
  WorkingTimeReportDto,
} from './dto/timesheet-report.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { DayOffCalculator } from './enums/day-off.enum';
import {
  TimesheetStatusManager,
  TimesheetType,
} from './enums/timesheet-status.enum';
import { QueryUtil } from './utils/query.util';
import { TimezoneUtil } from './utils/timezone.util';

@Injectable()
export class TimesheetService {
  constructor(private prisma: PrismaService) {}

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
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const dayoff = await this.prisma.day_offs.findFirst({
      where: {
        user_id: userId,
        start_date: {
          gte: new Date(createTimesheetDto.work_date),
          lte: new Date(createTimesheetDto.work_date),
        },
        end_date: {
          gte: new Date(createTimesheetDto.work_date),
          lte: new Date(createTimesheetDto.work_date),
        },
        deleted_at: null,
      },
    });

    // Kiểm tra trạng thái nghỉ phép cho ngày này
    if (dayoff) {
      switch (dayoff.status) {
        case DayOffStatus.APPROVED:
          throw new BadRequestException('Ngày này đã có nghỉ phép được duyệt');
        case DayOffStatus.REJECTED:
          throw new BadRequestException('Ngày này đã có nghỉ phép bị từ chối');
        case DayOffStatus.PENDING:
          break;
        default:
          throw new BadRequestException('Ngày này đã có nghỉ phép khác');
      }
    } else {
      throw new BadRequestException('Ngày này chưa có nghỉ phép');
    }

    // Kiểm tra đã tồn tại timesheet cho ngày này chưa
    const existingTimesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: userId,
        work_date: createTimesheetDto.work_date
          ? new Date(createTimesheetDto.work_date)
          : null,
        deleted_at: null,
      },
    });

    if (existingTimesheet) {
      throw new BadRequestException('Timesheet cho ngày này đã tồn tại');
    }

    return this.prisma.time_sheets.create({
      data: {
        ...createTimesheetDto,
        user_id: userId,
        work_date: createTimesheetDto.work_date
          ? new Date(createTimesheetDto.work_date)
          : null,
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
        request_type: createTimesheetDto.request_type,
      },
    });
  }

  async findAllTimesheets(
    userId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: Prisma.time_sheetsWhereInput = QueryUtil.onlyActive({
      user_id: userId,
    });

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
    const where: Prisma.time_sheetsWhereInput = QueryUtil.onlyActive({
      user_id: userId,
    });

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
            select: { name: true, email: true },
          },
        },
      }),
      this.prisma.time_sheets.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findTimesheetById(id: number) {
    const timesheet = await this.prisma.time_sheets.findFirst({
      where: QueryUtil.onlyActive({ id }),
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
      : TimesheetStatus.PENDING;
    if (!TimesheetStatusManager.canEdit(currentState)) {
      throw new BadRequestException(
        `Không thể sửa timesheet ở trạng thái: ${TimesheetStatusManager.getStateName(currentState)}`,
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
        request_type: 'NORMAL',
      },
    });
  }

  async removeTimesheet(id: number) {
    const timesheet = await this.findTimesheetById(id);

    // Kiểm tra xem timesheet có thể xóa không
    const currentState = timesheet.status
      ? timesheet.status
      : TimesheetStatus.PENDING;
    if (!TimesheetStatusManager.canDelete(currentState)) {
      throw new BadRequestException(
        `Không thể xóa timesheet ở trạng thái: ${TimesheetStatusManager.getStateName(currentState)}`,
      );
    }

    return this.prisma.time_sheets.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  // === CHECK-IN/CHECK-OUT ===

  async checkin(userId: number, checkinDto: CheckinDto) {
    // Tạo idempotency key từ user_id, work_date và timestamp
    const today = TimezoneUtil.getCurrentWorkDate();
    const idempotencyKey = `checkin_${userId}_${today}_${new Date().getTime()}`;

    // Validate với nghỉ phép nửa ngày
    await this.validateAttendanceWithDayOff(userId, today, 'checkin');

    return this.prisma.$transaction(async (tx) => {
      // Kiểm tra user tồn tại
      const user = await tx.users.findFirst({
        where: QueryUtil.onlyActive({ id: userId }),
      });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      const checkinTime = new Date();

      // Kiểm tra xem đã check-in hôm nay chưa (với lock để tránh race condition)
      const existingCheckin = await tx.attendance_logs.findFirst({
        where: QueryUtil.onlyActive({
          user_id: userId,
          action_type: 'checkin',
          work_date: new Date(today),
        }),
      });

      if (existingCheckin) {
        throw new BadRequestException('Bạn đã check-in hôm nay rồi');
      }

      // Kiểm tra idempotency - nếu có log với cùng key thì trả về kết quả cũ
      const _existingLog = await tx.attendance_logs.findFirst({
        where: QueryUtil.onlyActive({
          user_id: userId,
          note: idempotencyKey, // Tạm thời dùng note để lưu idempotency key
        }),
        include: {
          timesheet: true,
        },
      });

      if (_existingLog) {
        return {
          timesheet: _existingLog.timesheet,
          attendance_log: _existingLog,
          message: 'Check-in thành công (đã tồn tại)',
        };
      }

      // Tìm hoặc tạo timesheet cho hôm nay
      let timesheet = await tx.time_sheets.findFirst({
        where: QueryUtil.onlyActive({
          user_id: userId,
          work_date: new Date(today),
        }),
      });

      if (!timesheet) {
        timesheet = await tx.time_sheets.create({
          data: {
            user_id: userId,
            work_date: new Date(today),
            status: 'PENDING',
            type: 'NORMAL',
          },
        });
      }

      // Tính toán late time
      const workStart = new Date(today + 'T08:00:00.000Z'); // 8:00 AM
      const lateTime =
        checkinTime > workStart
          ? Math.floor(
              (checkinTime.getTime() - workStart.getTime()) / (1000 * 60),
            )
          : 0;

      // Tạo attendance log với idempotency key
      const attendanceLog = await tx.attendance_logs.create({
        data: {
          user_id: userId,
          timesheet_id: timesheet.id,
          action_type: 'checkin',
          timestamp: checkinTime,
          work_date: new Date(today),
          location_type: checkinDto.location_type || 'office',
          ip_address: checkinDto.ip_address,
          device_info: checkinDto.device_info,
          gps_latitude: checkinDto.gps_latitude,
          gps_longitude: checkinDto.gps_longitude,
          photo_url: checkinDto.photo_url,
          note: `${checkinDto.note || ''} [${idempotencyKey}]`,
          status: 'APPROVED',
        },
      });

      // Cập nhật timesheet
      const updatedTimesheet = await tx.time_sheets.update({
        where: { id: timesheet.id },
        data: {
          checkin: checkinTime,
          late_time: lateTime,
          remote: checkinDto.remote,
          status: 'APPROVED',
        },
      });

      return {
        timesheet: updatedTimesheet,
        attendance_log: attendanceLog,
        message: 'Check-in thành công',
      };
    });
  }

  async checkout(userId: number, checkoutDto: CheckoutDto) {
    // Tạo idempotency key từ user_id, work_date và timestamp
    const today = TimezoneUtil.getCurrentWorkDate();
    const idempotencyKey = `checkout_${userId}_${today}_${new Date().getTime()}`;

    // Validate với nghỉ phép nửa ngày
    await this.validateAttendanceWithDayOff(userId, today, 'checkout');

    return this.prisma.$transaction(async (tx) => {
      // Kiểm tra user tồn tại
      const user = await tx.users.findFirst({
        where: QueryUtil.onlyActive({ id: userId }),
      });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      const checkoutTime = new Date();

      // Kiểm tra đã check-in hôm nay chưa
      const existingCheckin = await tx.attendance_logs.findFirst({
        where: QueryUtil.onlyActive({
          user_id: userId,
          action_type: 'checkin',
          work_date: new Date(today),
        }),
      });

      if (!existingCheckin) {
        throw new BadRequestException('Bạn chưa check-in hôm nay');
      }

      // Kiểm tra đã check-out chưa
      const existingCheckout = await tx.attendance_logs.findFirst({
        where: QueryUtil.onlyActive({
          user_id: userId,
          action_type: 'checkout',
          work_date: new Date(today),
        }),
      });

      if (existingCheckout) {
        throw new BadRequestException('Bạn đã check-out hôm nay rồi');
      }

      // Kiểm tra idempotency - nếu có log với cùng key thì trả về kết quả cũ
      const _existingLog = await tx.attendance_logs.findFirst({
        where: QueryUtil.onlyActive({
          user_id: userId,
          note: { contains: idempotencyKey },
        }),
        include: {
          timesheet: true,
        },
      });

      if (_existingLog) {
        return {
          timesheet: _existingLog.timesheet,
          attendance_log: _existingLog,
          message: 'Check-out thành công (đã tồn tại)',
        };
      }

      // Tìm timesheet hôm nay
      const todayTimesheet = await tx.time_sheets.findFirst({
        where: QueryUtil.onlyActive({
          user_id: userId,
          work_date: new Date(today),
        }),
      });

      if (!todayTimesheet) {
        throw new BadRequestException('Không tìm thấy timesheet hôm nay');
      }

      // Tính toán thời gian
      const workEnd = new Date(today + 'T17:30:00.000Z'); // 5:30 PM
      const earlyTime =
        checkoutTime < workEnd
          ? Math.floor(
              (workEnd.getTime() - checkoutTime.getTime()) / (1000 * 60),
            )
          : 0;

      // Tính giờ làm việc (nếu có checkin time)
      let workTimeTotal = 0;
      let workTimeMorning = 0;
      let workTimeAfternoon = 0;
      const breakTime = 60; // Mặc định 60 phút nghỉ trưa

      if (todayTimesheet.checkin) {
        workTimeTotal = Math.floor(
          (checkoutTime.getTime() - todayTimesheet.checkin.getTime()) /
            (1000 * 60),
        );
        // Trừ thời gian nghỉ trưa
        const netWorkTime = Math.max(0, workTimeTotal - breakTime);
        workTimeMorning = Math.min(240, netWorkTime); // 4 giờ sáng tối đa
        workTimeAfternoon = Math.max(0, netWorkTime - 240);
      }

      // Tạo attendance log với idempotency key
      const attendanceLog = await tx.attendance_logs.create({
        data: {
          user_id: userId,
          timesheet_id: todayTimesheet.id,
          action_type: 'checkout',
          timestamp: checkoutTime,
          work_date: new Date(today),
          location_type: checkoutDto.location_type || 'office',
          ip_address: checkoutDto.ip_address,
          device_info: checkoutDto.device_info,
          gps_latitude: checkoutDto.gps_latitude,
          gps_longitude: checkoutDto.gps_longitude,
          photo_url: checkoutDto.photo_url,
          note: `${checkoutDto.note || ''} [${idempotencyKey}]`,
          status: 'APPROVED',
        },
      });

      // Cập nhật timesheet
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
        message: 'Check-out thành công',
      };
    });
  }

  async getTodayAttendance(userId: number) {
    const today = TimezoneUtil.getCurrentWorkDate();

    return this.prisma.time_sheets.findFirst({
      where: QueryUtil.onlyActive({
        user_id: userId,
        work_date: new Date(today),
      }),
    });
  }

  // === DAY OFF REQUESTS ===

  async createDayOffRequest(createDayOffRequestDto: CreateDayOffRequestDto) {
    // Kiểm tra user tồn tại
    const user = await this.prisma.users.findFirst({
      where: QueryUtil.onlyActive({ id: createDayOffRequestDto.user_id }),
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const contract = await this.prisma.contracts.findFirst({
      where: QueryUtil.onlyActive({
        user_id: createDayOffRequestDto.user_id,
        start_date: {
          lte: new Date(createDayOffRequestDto.start_date),
        },
        end_date: {
          gte: new Date(createDayOffRequestDto.end_date),
        },
      }),
    });
    if (!contract) {
      throw new NotFoundException('Không tìm thấy hợp đồng');
    }

    // Validate dates
    const startDate = new Date(createDayOffRequestDto.start_date);
    const endDate = new Date(createDayOffRequestDto.end_date);

    if (startDate > endDate) {
      throw new BadRequestException('Ngày bắt đầu không thể sau ngày kết thúc');
    }

    // Kiểm tra trùng lặp nghỉ phép
    const existingDayOff = await this.prisma.day_offs.findFirst({
      where: QueryUtil.onlyActive({
        user_id: createDayOffRequestDto.user_id,
        OR: [
          {
            start_date: {
              lte: endDate,
            },
            end_date: {
              gte: startDate,
            },
          },
        ],
        status: {
          in: [DayOffStatus.PENDING, DayOffStatus.APPROVED],
        },
      }),
    });

    if (existingDayOff) {
      throw new BadRequestException(
        'Đã có đơn nghỉ phép trong khoảng thời gian này',
      );
    }

    const { is_past, ...rest } = createDayOffRequestDto;

    return this.prisma.day_offs.create({
      data: {
        ...rest,
        start_date: startDate,
        end_date: endDate,
        duration: createDayOffRequestDto.duration,
        type: createDayOffRequestDto.type,
        is_past: is_past ? true : false,
        status: 'PENDING',
      },
    });
  }

  async findAllDayOffRequests(userId: number) {
    return this.prisma.day_offs.findMany({
      where: QueryUtil.onlyActive({ user_id: userId }),
      orderBy: { created_at: 'desc' },
    });
  }

  async findMyDayOffRequestsPaginated(
    userId: number,
    paginationDto: DayOffRequestPaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.day_offsWhereInput = QueryUtil.onlyActive({
      user_id: userId,
    });

    // Thêm filter theo status
    if (paginationDto.status) {
      where.status = paginationDto.status;
    }

    // Thêm filter theo leave_type
    if (paginationDto.leave_type) {
      where.type = paginationDto.leave_type;
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.day_offs.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      this.prisma.day_offs.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async updateDayOffRequestStatus(
    id: number,
    status: DayOffStatus,
    approverId?: number,
    rejectedReason?: string,
  ) {
    const dayOff = await this.prisma.day_offs.findFirst({
      where: QueryUtil.onlyActive({ id }),
    });

    if (!dayOff) {
      throw new NotFoundException('Không tìm thấy đơn nghỉ phép');
    }

    const updateData: Prisma.day_offsUpdateInput = { status };

    if (status === DayOffStatus.APPROVED) {
      updateData.approved_by_user = { connect: { id: approverId } };
      updateData.approved_at = new Date();

      // Tự động tạo timesheet khi duyệt nghỉ phép
      await this.createTimesheetsForDayOff(dayOff);
    } else if (status === DayOffStatus.REJECTED) {
      updateData.rejected_reason = rejectedReason;
      if (!rejectedReason) {
        throw new BadRequestException(
          'Lý do từ chối là bắt buộc khi từ chối đơn nghỉ phép',
        );
      }
    } else {
      throw new BadRequestException(
        'Trạng thái chỉ được là APPROVED (duyệt) hoặc REJECTED (từ chối)',
      );
    }

    return this.prisma.day_offs.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Tự động tạo timesheet khi duyệt nghỉ phép
   */
  private async createTimesheetsForDayOff(dayOff: any) {
    const startDate = new Date(dayOff.start_date);
    const endDate = new Date(dayOff.end_date);

    // Tạo timesheet cho từng ngày nghỉ
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Kiểm tra xem đã có timesheet chưa
      const existingTimesheet = await this.prisma.time_sheets.findFirst({
        where: QueryUtil.onlyActive({
          user_id: dayOff.user_id,
          work_date: new Date(currentDate),
        }),
      });

      if (!existingTimesheet) {
        // Tính toán work time dựa vào duration
        const workHours = DayOffCalculator.calculateWorkHours(dayOff.duration);

        await this.prisma.time_sheets.create({
          data: {
            user_id: dayOff.user_id,
            work_date: new Date(currentDate),
            day_off_id: dayOff.id,
            status: 'APPROVED', // Tự động approved vì đã được duyệt nghỉ phép
            type: 'NORMAL', // Default type for day off
            work_time_morning: workHours.morningHours,
            work_time_afternoon: workHours.afternoonHours,
            total_work_time: workHours.totalHours,
            is_complete: dayOff.duration === 'FULL_DAY' ? false : true, // Nếu nghỉ cả ngày thì không complete
            paid_leave: dayOff.type === DayOffType.PAID ? dayOff.reason : null,
            unpaid_leave:
              dayOff.type === DayOffType.UNPAID ? dayOff.reason : null,
          },
        });
      } else {
        // Cập nhật timesheet hiện tại với thông tin nghỉ phép
        const workHours = DayOffCalculator.calculateWorkHours(dayOff.duration);

        await this.prisma.time_sheets.update({
          where: { id: existingTimesheet.id },
          data: {
            day_off_id: dayOff.id,
            work_time_morning: workHours.morningHours,
            work_time_afternoon: workHours.afternoonHours,
            total_work_time: workHours.totalHours,
            paid_leave:
              dayOff.type === DayOffType.PAID
                ? dayOff.reason
                : existingTimesheet.paid_leave,
            unpaid_leave:
              dayOff.type === DayOffType.UNPAID
                ? dayOff.reason
                : existingTimesheet.unpaid_leave,
          },
        });
      }

      // Chuyển sang ngày tiếp theo
      currentDate.setDate(currentDate.getDate() + 1);
    }
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
      where: QueryUtil.onlyActive({
        user_id: userId,
        start_date: {
          lte: targetDate,
        },
        end_date: {
          gte: targetDate,
        },
        status: 'APPROVED',
      }),
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

  /**
   * Validate check-in/out với nghỉ phép nửa ngày
   */
  private async validateAttendanceWithDayOff(
    userId: number,
    workDate: string,
    actionType: 'checkin' | 'checkout',
  ) {
    const dayOffInfo = await this.getDayOffInfo(userId, workDate);

    if (!dayOffInfo.hasDayOff) {
      return; // Không có nghỉ phép, cho phép check-in/out bình thường
    }

    if (!dayOffInfo.needsAttendance) {
      throw new BadRequestException(
        `Bạn nghỉ ${DayOffCalculator.getDurationName(dayOffInfo.dayOff.duration)}, không cần ${actionType}`,
      );
    }

    // Nếu nghỉ buổi sáng, chỉ cho phép check-in sau 13:00
    if (
      dayOffInfo.dayOff.duration === DayOffDuration.MORNING &&
      actionType === 'checkin'
    ) {
      const currentTime = new Date();
      const afternoonStart = new Date(workDate + 'T13:00:00.000Z');

      if (currentTime < afternoonStart) {
        throw new BadRequestException(
          'Bạn nghỉ buổi sáng, chỉ có thể check-in từ 13:00',
        );
      }
    }

    // Nếu nghỉ buổi chiều, chỉ cho phép check-out trước 12:00
    if (
      dayOffInfo.dayOff.duration === DayOffDuration.AFTERNOON &&
      actionType === 'checkout'
    ) {
      const currentTime = new Date();
      const morningEnd = new Date(workDate + 'T12:00:00.000Z');

      if (currentTime > morningEnd) {
        throw new BadRequestException(
          'Bạn nghỉ buổi chiều, chỉ có thể check-out trước 12:00',
        );
      }
    }
  }

  // === OVERTIME REQUESTS ===

  async createOvertimeRequest(
    createOvertimeRequestDto: CreateOvertimeRequestDto,
  ) {
    // Kiểm tra user tồn tại
    const user = await this.prisma.users.findFirst({
      where: QueryUtil.onlyActive({ id: createOvertimeRequestDto.user_id }),
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return this.prisma.over_times_history.create({
      data: {
        ...createOvertimeRequestDto,
        date: createOvertimeRequestDto.date
          ? new Date(createOvertimeRequestDto.date)
          : new Date(),
        start_time: createOvertimeRequestDto.start_time
          ? new Date(createOvertimeRequestDto.start_time)
          : new Date(),
        end_time: createOvertimeRequestDto.end_time
          ? new Date(createOvertimeRequestDto.end_time)
          : new Date(),
      },
    });
  }

  async findAllOvertimeRequests(userId: number) {
    return this.prisma.over_times_history.findMany({
      where: QueryUtil.onlyActive({ user_id: userId }),
      orderBy: { created_at: 'desc' },
    });
  }

  async findMyOvertimeRequestsPaginated(
    userId: number,
    paginationDto: OvertimeRequestPaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.over_times_historyWhereInput = QueryUtil.onlyActive({
      user_id: userId,
    });

    // Thêm filter theo ngày
    if (paginationDto.start_date && paginationDto.end_date) {
      where.date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.prisma.over_times_history.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      this.prisma.over_times_history.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  // === HOLIDAYS MANAGEMENT ===

  async createHoliday(createHolidayDto: CreateHolidayDto) {
    const holiday = await this.prisma.holidays.findFirst({
      where: QueryUtil.onlyActive({ name: createHolidayDto.name }),
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
    const where: Prisma.holidaysWhereInput = QueryUtil.onlyActive({});

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
    const where: Prisma.holidaysWhereInput = QueryUtil.onlyActive({});

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
      where: QueryUtil.onlyActive({ id }),
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
      where: QueryUtil.onlyActive({ id }),
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
    const startDate = start_date || TimezoneUtil.getCurrentWorkDate();
    const endDate =
      end_date ||
      TimezoneUtil.formatWorkDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

    // Lấy timesheet - sử dụng work_date thay vì checkin
    const timesheets = await this.prisma.time_sheets.findMany({
      where: QueryUtil.onlyActive({
        user_id: userId,
        ...QueryUtil.workDateRange(startDate, endDate),
      }),
      orderBy: { work_date: 'asc' },
    });

    // Lấy ngày nghỉ phép
    const dayOffs = await this.prisma.day_offs.findMany({
      where: QueryUtil.onlyActive({
        user_id: userId,
        status: 'APPROVED',
      }),
    });

    // Lấy lịch làm thêm giờ
    const overtimes = await this.prisma.over_times_history.findMany({
      where: QueryUtil.onlyActive({
        user_id: userId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
      orderBy: { date: 'asc' },
    });

    // Lấy ngày lễ
    const holidays = await this.prisma.holidays.findMany({
      where: QueryUtil.onlyActive({
        start_date: {
          lte: new Date(endDate),
        },
        end_date: {
          gte: new Date(startDate),
        },
        status: HolidayStatus.ACTIVE,
      }),
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
    const startDate = start_date || TimezoneUtil.getCurrentWorkDate();
    const endDate =
      end_date ||
      TimezoneUtil.formatWorkDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      );

    // Lấy danh sách thành viên team
    const teamMembers = await this.prisma.user_division.findMany({
      where: { teamId: teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const userIds = teamMembers.map((member) => member.userId);

    // Lấy timesheet của tất cả thành viên - sử dụng work_date
    const timesheets = await this.prisma.time_sheets.findMany({
      where: QueryUtil.onlyActive({
        user_id: { in: userIds },
        ...QueryUtil.workDateRange(startDate, endDate),
      }),
      orderBy: { work_date: 'asc' },
    });

    // Lấy ngày nghỉ phép của team
    const dayOffs = await this.prisma.day_offs.findMany({
      where: QueryUtil.onlyActive({
        user_id: { in: userIds },
        status: DayOffStatus.APPROVED, // Đã duyệt
      }),
    });

    return {
      teamMembers: teamMembers.map((member) => member.user),
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
      where: QueryUtil.onlyActive({
        user_id: userId,
        status: DayOffStatus.PENDING, // Chờ duyệt
      }),
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
      where: QueryUtil.onlyActive({
        user_id: userId,
        status: TimesheetStatus.REJECTED, // Từ chối
      }),
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
      TimezoneUtil.formatWorkDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      );
    const endDate = end_date || TimezoneUtil.getCurrentWorkDate();

    let userIds: number[] = [];

    if (Number(team_id)) {
      const teamMembers = await this.prisma.user_division.findMany({
        where: { teamId: Number(team_id) },
        select: { userId: true },
      });
      userIds = teamMembers.map((member) => member.userId);
    } else if (Number(division_id)) {
      const divisionMembers = await this.prisma.user_division.findMany({
        where: { divisionId: Number(division_id) },
        select: { userId: true },
      });
      userIds = divisionMembers.map((member) => member.userId);
    }

    const where: any = QueryUtil.onlyActive({
      ...QueryUtil.workDateRange(startDate, endDate),
    });

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
          name: true,
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
    const endDate = TimezoneUtil.formatWorkDate(
      new Date(
        parseInt(reportMonth.split('-')[0]),
        parseInt(reportMonth.split('-')[1]),
        0,
      ),
    );

    const where: Prisma.time_sheetsWhereInput = QueryUtil.onlyActive({
      ...QueryUtil.workDateRange(startDate, endDate),
    });

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
    const start =
      startDate ||
      TimezoneUtil.formatWorkDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      );
    const end = endDate || TimezoneUtil.getCurrentWorkDate();

    const where: Prisma.time_sheetsWhereInput = QueryUtil.onlyActive({
      ...QueryUtil.workDateRange(start, end),
    });

    if (userId) {
      where.user_id = Number(userId);
    }

    const timesheets = await this.prisma.time_sheets.findMany({
      where,
    });

    const dayOffs = await this.prisma.day_offs.findMany({
      where: QueryUtil.onlyActive({
        ...(userId && { user_id: Number(userId) }),
        status: DayOffStatus.APPROVED, // Approved
      }),
    });

    const overtimes = await this.prisma.over_times_history.findMany({
      where: QueryUtil.onlyActive({
        ...(userId && { user_id: Number(userId) }),
        date: {
          gte: new Date(start),
          lte: new Date(end),
        },
      }),
    });

    return {
      attendance: {
        total_days: timesheets.length,
        on_time: timesheets.filter((t) => !t.late_time || t.late_time === 0)
          .length,
        late: timesheets.filter((t) => t.late_time && t.late_time > 0).length,
        early_leave: timesheets.filter((t) => t.early_time && t.early_time > 0)
          .length,
        remote_days: timesheets.filter((t) => t.remote === 'REMOTE').length,
      },
      leave: {
        total_days_off: dayOffs.reduce((sum, dayOff) => sum + dayOff.total, 0),
        paid_leave: dayOffs
          .filter((d) => d.type === 'PAID')
          .reduce((sum, dayOff) => sum + dayOff.total, 0),
        unpaid_leave: dayOffs
          .filter((d) => d.type === 'UNPAID')
          .reduce((sum, dayOff) => sum + dayOff.total, 0),
        sick_leave: dayOffs
          .filter((d) => d.type === 'SICK')
          .reduce((sum, dayOff) => sum + dayOff.total, 0),
      },
      overtime: {
        total_hours: overtimes.reduce((sum, ot) => sum + (ot.total || 0), 0),
        total_sessions: overtimes.length,
      },
      period: { start_date: start, end_date: end },
    };
  }

  // === ATTENDANCE LOGS MANAGEMENT ===

  async createAttendanceLog(
    createAttendanceLogDto: CreateAttendanceLogDto,
    currentUserId: number,
  ) {
    // Kiểm tra nếu có timesheet_id, đảm bảo nó thuộc về user hiện tại
    if (createAttendanceLogDto.timesheet_id) {
      const timesheet = await this.prisma.time_sheets.findFirst({
        where: QueryUtil.onlyActive({
          id: createAttendanceLogDto.timesheet_id,
        }),
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
      where: QueryUtil.onlyActive({
        user_id: createAttendanceLogDto.timesheet_id
          ? undefined
          : currentUserId,
        work_date: workDate,
      }),
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
      !TimezoneUtil.isSameWorkDate(workDate, timesheet.work_date || new Date())
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
        status: createAttendanceLogDto.status || TimesheetStatus.PENDING,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
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

    const where: any = QueryUtil.onlyActive({});

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
            select: { id: true, name: true, email: true },
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
    currentUserId: number,
    paginationDto: AttendanceLogPaginationDto,
    userRoles?: string[],
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = QueryUtil.onlyActive({});

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
            select: { id: true, name: true, email: true },
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
          select: { id: true, name: true, email: true },
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
    currentUserId: number,
  ) {
    await this.getAttendanceLogById(id);

    return this.prisma.attendance_logs.update({
      where: { id },
      data: {
        ...updateAttendanceLogDto,
        approved_by: updateAttendanceLogDto.approved_by || currentUserId,
        status: updateAttendanceLogDto.status || TimesheetStatus.PENDING,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
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
      where: QueryUtil.onlyActive({
        user_id: userId,
        work_date: targetDate,
      }),
    });

    if (existing) {
      throw new BadRequestException('Timesheet cho ngày này đã tồn tại');
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
      !TimesheetStatusManager.canTransition(
        timesheet.status || TimesheetStatus.PENDING,
        TimesheetStatus.APPROVED,
      )
    ) {
      throw new BadRequestException(
        `Không thể submit timesheet từ trạng thái: ${TimesheetStatusManager.getStateName(timesheet.status || TimesheetStatus.PENDING)}`,
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

    const currentState = timesheet.status || TimesheetStatus.PENDING;
    if (
      !TimesheetStatusManager.canTransition(
        currentState,
        TimesheetStatus.APPROVED,
      )
    ) {
      throw new BadRequestException(
        `Không thể duyệt timesheet từ trạng thái: ${TimesheetStatusManager.getStateName(currentState)}`,
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

    const currentState = timesheet.status || TimesheetStatus.PENDING;
    if (
      !TimesheetStatusManager.canTransition(
        currentState,
        TimesheetStatus.REJECTED,
      )
    ) {
      throw new BadRequestException(
        `Không thể từ chối timesheet từ trạng thái: ${TimesheetStatusManager.getStateName(currentState)}`,
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

    const currentState = timesheet.status || TimesheetStatus.PENDING;
    if (
      !TimesheetStatusManager.canTransition(
        currentState,
        TimesheetStatus.APPROVED,
      )
    ) {
      throw new BadRequestException(
        `Không thể khóa timesheet từ trạng thái: ${TimesheetStatusManager.getStateName(currentState)}`,
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
   * Khóa hàng loạt timesheet theo kỳ lương
   */
  async bulkLockTimesheets(
    startDate: string,
    endDate: string,
    userIds?: number[],
  ) {
    const where: any = QueryUtil.onlyActive({
      status: TimesheetStatus.APPROVED,
      ...QueryUtil.workDateRange(startDate, endDate),
    });

    if (userIds?.length) {
      where.user_id = { in: userIds };
    }

    const result = await this.prisma.time_sheets.updateMany({
      where,
      data: {
        status: 'APPROVED', // LOCKED maps to APPROVED in new schema
      },
    });

    return {
      message: `Đã khóa ${result.count} timesheet`,
      locked_count: result.count,
    };
  }

  async createBulkDailyTimesheets(workDate: string, userIds?: number[]) {
    const targetDate = new Date(workDate);

    // Nếu không có userIds thì lấy tất cả user active
    let targetUserIds = userIds;
    if (!targetUserIds || targetUserIds.length === 0) {
      const activeUsers = await this.prisma.users.findMany({
        where: QueryUtil.onlyActive({}),
        select: { id: true },
      });
      targetUserIds = activeUsers.map((u) => u.id);
    }

    // Lọc ra những user chưa có timesheet cho ngày này
    const existingTimesheets = await this.prisma.time_sheets.findMany({
      where: QueryUtil.onlyActive({
        user_id: { in: targetUserIds },
        work_date: targetDate,
      }),
      select: { user_id: true },
    });

    const existingUserIds = existingTimesheets.map((t) => t.user_id);
    const newUserIds = targetUserIds.filter(
      (id) => !existingUserIds.includes(id),
    );

    if (newUserIds.length === 0) {
      return {
        message: 'Tất cả user đã có timesheet cho ngày này',
        created: 0,
      };
    }

    // Tạo timesheet cho các user chưa có
    const createData = newUserIds.map((userId) => ({
      user_id: userId,
      work_date: targetDate,
      status: TimesheetStatus.PENDING,
      type: TimesheetType.NORMAL,
    }));

    await this.prisma.time_sheets.createMany({
      data: createData,
    });

    return {
      message: `Đã tạo ${newUserIds.length} timesheet`,
      created: newUserIds.length,
      user_ids: newUserIds,
    };
  }

  /**
   * Tự động tạo timesheet hàng ngày cho cronjob
   * Chỉ tạo cho ngày làm việc (thứ 2-6), bỏ qua cuối tuần và ngày lễ
   */
  async autoDailyTimesheetCreation(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7

    // Bỏ qua cuối tuần (Chủ nhật = 0, Thứ 7 = 6)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        message: 'Bỏ qua cuối tuần, không tạo timesheet',
        created: 0,
        skipped_reason: 'weekend',
        date: targetDate.toISOString().split('T')[0],
      };
    }

    // Kiểm tra ngày lễ
    const holiday = await this.prisma.holidays.findFirst({
      where: {
        start_date: {
          lte: targetDate,
        },
        end_date: {
          gte: targetDate,
        },
        deleted_at: null,
      },
    });

    if (holiday) {
      return {
        message: `Bỏ qua ngày lễ: ${holiday.name}`,
        created: 0,
        skipped_reason: 'holiday',
        holiday_name: holiday.name,
        date: targetDate.toISOString().split('T')[0],
      };
    }

    // Lấy tất cả user active (không bao gồm admin nếu không cần)
    const activeUsers = await this.prisma.users.findMany({
      where: QueryUtil.onlyActive({}),
      include: {
        user_information: {
          include: {
            role: true,
          },
        },
      },
    });

    // Lọc user cần tạo timesheet (có thể exclude một số role)
    const eligibleUsers = activeUsers.filter((_user) => {
      // Có thể thêm logic filter theo role, department, etc.
      return true; // Tạm thời cho tất cả user
    });

    const userIds = eligibleUsers.map((u) => u.id);

    if (userIds.length === 0) {
      return {
        message: 'Không có user nào cần tạo timesheet',
        created: 0,
        date: targetDate.toISOString().split('T')[0],
      };
    }

    // Kiểm tra user nào đã có timesheet
    const existingTimesheets = await this.prisma.time_sheets.findMany({
      where: QueryUtil.onlyActive({
        user_id: { in: userIds },
        work_date: targetDate,
      }),
      select: { user_id: true },
    });

    const existingUserIds = existingTimesheets.map((t) => t.user_id);
    const newUserIds = userIds.filter((id) => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return {
        message: 'Tất cả user đã có timesheet cho ngày này',
        created: 0,
        already_exists: existingUserIds.length,
        date: targetDate.toISOString().split('T')[0],
      };
    }

    // Tạo timesheet cho các user chưa có
    const createData = newUserIds.map((userId) => ({
      user_id: userId,
      work_date: targetDate,
      status: TimesheetStatus.PENDING,
      type: TimesheetType.NORMAL,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    try {
      await this.prisma.time_sheets.createMany({
        data: createData,
      });

      return {
        message: `Cronjob: Đã tạo ${newUserIds.length} timesheet tự động`,
        created: newUserIds.length,
        already_exists: existingUserIds.length,
        total_users: userIds.length,
        date: targetDate.toISOString().split('T')[0],
        created_for_users: newUserIds,
      };
    } catch (error) {
      throw new BadRequestException(
        `Lỗi khi tạo timesheet tự động: ${error.message}`,
      );
    }
  }
}
