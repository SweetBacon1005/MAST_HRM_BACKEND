import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DayOffStatus,
  DayOffType,
  RemoteType,
  TimesheetStatus,
} from '@prisma/client';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { CreateDayOffRequestDto } from '../timesheet/dto/create-day-off-request.dto';
import { CreateOvertimeRequestDto } from '../timesheet/dto/create-overtime-request.dto';
import { QueryUtil } from '../timesheet/utils/query.util';
import { CreateRemoteWorkRequestDto } from './dto/create-remote-work-request.dto';
import { RequestPaginationDto, RemoteWorkRequestPaginationDto } from './dto/request-pagination.dto';
import { DayOffRequestResponseDto } from './dto/response/day-off-request-response.dto';
import { OvertimeRequestResponseDto } from './dto/response/overtime-request-response.dto';
import { RemoteWorkRequestResponseDto } from './dto/response/remote-work-request-response.dto';
import { ApprovalResult, RequestType } from './interfaces/request.interface';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  // === COMMON UTILITIES ===

  private async validateUser(userId: number): Promise<void> {
    const user = await this.prisma.users.findFirst({
      where: QueryUtil.onlyActive({ id: userId }),
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
      throw new BadRequestException('Ngày bắt đầu không thể sau ngày kết thúc');
    }
  }

  private validateFutureDate(date: Date, allowPast = false): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!allowPast && date < today) {
      throw new BadRequestException(
        'Không thể tạo request cho ngày trong quá khứ',
      );
    }
  }

  // === REMOTE WORK REQUESTS ===

  async createRemoteWorkRequest(
    dto: CreateRemoteWorkRequestDto,
  ): Promise<RemoteWorkRequestResponseDto> {
    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);
    this.validateFutureDate(workDate, false);

    // Check existing request
    const existingRequest = await this.prisma.remote_work_requests.findFirst({
      where: QueryUtil.onlyActive({
        user_id: dto.user_id,
        work_date: workDate,
      }),
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Đã có đơn xin làm việc từ xa cho ngày này',
      );
    }

    // Check day-off conflict
    const dayOff = await this.prisma.day_offs.findFirst({
      where: QueryUtil.onlyActive({
        user_id: dto.user_id,
        start_date: { lte: workDate },
        end_date: { gte: workDate },
        status: 'APPROVED',
      }),
    });

    if (dayOff) {
      throw new BadRequestException(
        'Không thể tạo đơn remote work cho ngày đã có nghỉ phép',
      );
    }

    if (dto.remote_type === RemoteType.OFFICE) {
      throw new BadRequestException(
        'Không cần tạo đơn cho làm việc tại văn phòng',
      );
    }

    return await this.prisma.remote_work_requests.create({
      data: {
        user_id: dto.user_id,
        work_date: workDate,
        remote_type: dto.remote_type,
        reason: dto.reason,
        note: dto.note,
        status: TimesheetStatus.PENDING,
      },
    });
  }

  async findMyRemoteWorkRequests(
    userId: number,
    paginationDto: RemoteWorkRequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = QueryUtil.onlyActive({ user_id: userId });

    if (paginationDto.status) where.status = paginationDto.status;
    if (paginationDto.remote_type)
      where.remote_type = paginationDto.remote_type;
    if (paginationDto.start_date && paginationDto.end_date) {
      where.work_date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.remote_work_requests.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          approved_by_user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.remote_work_requests.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }


  // === DAY OFF REQUESTS ===

  async createDayOffRequest(
    dto: CreateDayOffRequestDto,
  ): Promise<DayOffRequestResponseDto> {
    await this.validateUser(dto.user_id);

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);
    this.validateDateRange(startDate, endDate);

    // Check overlapping
    const existingDayOff = await this.prisma.day_offs.findFirst({
      where: QueryUtil.onlyActive({
        user_id: dto.user_id,
        OR: [
          {
            start_date: { lte: endDate },
            end_date: { gte: startDate },
          },
        ],
        status: { in: [DayOffStatus.PENDING, DayOffStatus.APPROVED] },
      }),
    });

    if (existingDayOff) {
      throw new BadRequestException(
        'Đã có đơn nghỉ phép trong khoảng thời gian này',
      );
    }

    const { is_past, ...rest } = dto;

    return await this.prisma.day_offs.create({
      data: {
        ...rest,
        start_date: startDate,
        end_date: endDate,
        duration: dto.duration,
        type: dto.type,
        is_past: is_past ? true : false,
        status: 'PENDING',
      },
    });
  }

  async findMyDayOffRequests(
    userId: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = QueryUtil.onlyActive({ user_id: userId });

    if (paginationDto.status) where.status = paginationDto.status;
    if (paginationDto.start_date && paginationDto.end_date) {
      where.start_date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.day_offs.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          approved_by_user: { select: { name: true, email: true } },
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

  // === OVERTIME REQUESTS ===

  async createOvertimeRequest(
    dto: CreateOvertimeRequestDto,
  ): Promise<OvertimeRequestResponseDto> {
    await this.validateUser(dto.user_id);

    const startTime = new Date(dto.start_time);
    const endTime = new Date(dto.end_time);

    // Note: Validation cho thời gian đã được xử lý ở DTO level

    // Validate project if provided
    if (dto.project_id) {
      const project = await this.prisma.projects.findFirst({
        where: QueryUtil.onlyActive({ id: dto.project_id }),
      });
      if (!project) {
        throw new BadRequestException('Không tìm thấy dự án');
      }
    }

    // Check overlapping với các request đang pending hoặc approved
    const existingOvertime = await this.prisma.over_times_history.findFirst({
      where: QueryUtil.onlyActive({
        user_id: dto.user_id,
        date: new Date(dto.date),
        status: { in: [TimesheetStatus.PENDING, TimesheetStatus.APPROVED] },
        OR: [
          {
            start_time: { lt: endTime },
            end_time: { gt: startTime },
          },
        ],
      }),
    });

    if (existingOvertime) {
      throw new BadRequestException(
        'Đã có đơn làm thêm giờ trong khoảng thời gian này',
      );
    }

    const totalHours =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    return await this.prisma.over_times_history.create({
      data: {
        user_id: dto.user_id,
        date: dto.date ? new Date(dto.date) : new Date(),
        start_time: startTime,
        end_time: endTime,
        total: totalHours,
        value: dto.value,
        project_id: dto.project_id,
        reason: dto.reason,
        status: TimesheetStatus.PENDING, // Set default status
      },
    });
  }

  async findMyOvertimeRequests(
    userId: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = QueryUtil.onlyActive({ user_id: userId });

    if (paginationDto.status) where.status = paginationDto.status;
    if (paginationDto.start_date && paginationDto.end_date) {
      where.date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.over_times_history.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          project: { select: { name: true, code: true } },
          approved_by_user: { select: { name: true, email: true } },
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

  // === OVERVIEW METHODS ===

  async getAllMyRequests(
    userId: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const [remoteWorkRequests, dayOffRequests, overtimeRequests] =
      await Promise.all([
        this.findMyRemoteWorkRequests(userId, paginationDto),
        this.findMyDayOffRequests(userId, paginationDto),
        this.findMyOvertimeRequests(userId, paginationDto),
      ]);

    return {
      remote_work: remoteWorkRequests,
      day_offs: dayOffRequests,
      overtimes: overtimeRequests,
    };
  }

  async getMyRequestsStats(userId: number) {
    const [remoteWork, dayOffs, overtimes] = await Promise.all([
      this.prisma.remote_work_requests.groupBy({
        by: ['status'],
        where: QueryUtil.onlyActive({ user_id: userId }),
        _count: { status: true },
      }),
      this.prisma.day_offs.groupBy({
        by: ['status'],
        where: QueryUtil.onlyActive({ user_id: userId }),
        _count: { status: true },
      }),
      this.prisma.over_times_history.groupBy({
        by: ['status'],
        where: QueryUtil.onlyActive({ user_id: userId }),
        _count: { status: true },
      }),
    ]);

    const getStatusCounts = (data: any[]) => {
      const result = { total: 0, pending: 0, approved: 0, rejected: 0 };
      data.forEach((item) => {
        result.total += item._count.status;
        if (item.status === 'PENDING') result.pending = item._count.status;
        if (item.status === 'APPROVED') result.approved = item._count.status;
        if (item.status === 'REJECTED') result.rejected = item._count.status;
      });
      return result;
    };

    const remoteWorkStats = getStatusCounts(remoteWork);
    const dayOffStats = getStatusCounts(dayOffs);
    const overtimeStats = getStatusCounts(overtimes);

    return {
      total: remoteWorkStats.total + dayOffStats.total + overtimeStats.total,
      pending:
        remoteWorkStats.pending + dayOffStats.pending + overtimeStats.pending,
      approved:
        remoteWorkStats.approved +
        dayOffStats.approved +
        overtimeStats.approved,
      rejected:
        remoteWorkStats.rejected +
        dayOffStats.rejected +
        overtimeStats.rejected,
      by_type: {
        [RequestType.REMOTE_WORK]: remoteWorkStats,
        [RequestType.DAY_OFF]: dayOffStats,
        [RequestType.OVERTIME]: overtimeStats,
      },
    };
  }

  // === APPROVAL METHODS ===

  async approveRequest(
    requestType: RequestType,
    requestId: number,
    approverId: number,
  ): Promise<ApprovalResult> {
    await this.validateUser(approverId);

    switch (requestType) {
      case RequestType.REMOTE_WORK:
        return await this.approveRemoteWorkRequest(requestId, approverId);
      case RequestType.DAY_OFF:
        return await this.approveDayOffRequest(requestId, approverId);
      case RequestType.OVERTIME:
        return await this.approveOvertimeRequest(requestId, approverId);
      default:
        throw new BadRequestException(
          `Unsupported request type: ${requestType}`,
        );
    }
  }

  async rejectRequest(
    requestType: RequestType,
    requestId: number,
    rejectorId: number,
    reason: string,
  ): Promise<ApprovalResult> {
    await this.validateUser(rejectorId);

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Lý do từ chối là bắt buộc');
    }

    switch (requestType) {
      case RequestType.REMOTE_WORK:
        return await this.rejectRemoteWorkRequest(
          requestId,
          rejectorId,
          reason,
        );
      case RequestType.DAY_OFF:
        return await this.rejectDayOffRequest(requestId, rejectorId, reason);
      case RequestType.OVERTIME:
        return await this.rejectOvertimeRequest(requestId, rejectorId, reason);
      default:
        throw new BadRequestException(
          `Unsupported request type: ${requestType}`,
        );
    }
  }

  // === PRIVATE APPROVAL METHODS ===

  private async approveRemoteWorkRequest(
    id: number,
    approverId: number,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.remote_work_requests.findFirst({
      where: QueryUtil.onlyActive({ id }),
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy remote work request');
    }

    if (request.status !== TimesheetStatus.PENDING) {
      throw new BadRequestException(
        `Không thể duyệt request ở trạng thái: ${request.status}`,
      );
    }

    const updatedRequest = await this.prisma.remote_work_requests.update({
      where: { id },
      data: {
        status: TimesheetStatus.APPROVED,
        approved_by: approverId,
        approved_at: new Date(),
      },
    });

    // Auto update timesheet
    await this.updateTimesheetRemoteType(updatedRequest);

    return {
      success: true,
      message: 'Đã duyệt remote work request thành công',
      data: updatedRequest,
    };
  }

  private async rejectRemoteWorkRequest(
    id: number,
    rejectorId: number,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.remote_work_requests.findFirst({
      where: QueryUtil.onlyActive({ id }),
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy remote work request');
    }

    if (request.status !== TimesheetStatus.PENDING) {
      throw new BadRequestException(
        `Không thể từ chối request ở trạng thái: ${request.status}`,
      );
    }

    const updatedRequest = await this.prisma.remote_work_requests.update({
      where: { id },
      data: {
        status: TimesheetStatus.REJECTED,
        rejected_reason: reason,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'Đã từ chối remote work request',
      data: updatedRequest,
    };
  }

  private async approveDayOffRequest(
    id: number,
    approverId: number,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.day_offs.findFirst({
      where: QueryUtil.onlyActive({ id }),
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy day-off request');
    }

    if (request.status !== DayOffStatus.PENDING) {
      throw new BadRequestException(
        `Không thể duyệt request ở trạng thái: ${request.status}`,
      );
    }

    const updatedRequest = await this.prisma.day_offs.update({
      where: { id },
      data: {
        status: DayOffStatus.APPROVED,
        approved_by: approverId,
        approved_at: new Date(),
      },
    });

    // Auto create timesheets
    await this.createTimesheetsForDayOff(updatedRequest);

    return {
      success: true,
      message: 'Đã duyệt day-off request thành công',
      data: updatedRequest,
    };
  }

  private async rejectDayOffRequest(
    id: number,
    rejectorId: number,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.day_offs.findFirst({
      where: QueryUtil.onlyActive({ id }),
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy day-off request');
    }

    if (request.status !== DayOffStatus.PENDING) {
      throw new BadRequestException(
        `Không thể từ chối request ở trạng thái: ${request.status}`,
      );
    }

    const updatedRequest = await this.prisma.day_offs.update({
      where: { id },
      data: {
        status: DayOffStatus.REJECTED,
        rejected_reason: reason,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'Đã từ chối day-off request',
      data: updatedRequest,
    };
  }

  private async approveOvertimeRequest(
    id: number,
    approverId: number,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.over_times_history.findFirst({
      where: QueryUtil.onlyActive({ id }),
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy overtime request');
    }

    if (request.status !== TimesheetStatus.PENDING) {
      throw new BadRequestException(
        `Không thể duyệt request ở trạng thái: ${request.status}`,
      );
    }

    const updatedRequest = await this.prisma.over_times_history.update({
      where: { id },
      data: {
        status: TimesheetStatus.APPROVED,
        approved_by: approverId,
        approved_at: new Date(),
      },
    });

    // Auto update timesheet
    await this.updateTimesheetWithOvertime(updatedRequest);

    return {
      success: true,
      message: 'Đã duyệt overtime request thành công',
      data: updatedRequest,
    };
  }

  private async rejectOvertimeRequest(
    id: number,
    rejectorId: number,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.over_times_history.findFirst({
      where: QueryUtil.onlyActive({ id }),
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy overtime request');
    }

    if (request.status !== TimesheetStatus.PENDING) {
      throw new BadRequestException(
        `Không thể từ chối request ở trạng thái: ${request.status}`,
      );
    }

    const updatedRequest = await this.prisma.over_times_history.update({
      where: { id },
      data: {
        status: TimesheetStatus.REJECTED,
        rejected_reason: reason,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'Đã từ chối overtime request',
      data: updatedRequest,
    };
  }

  // === HELPER METHODS ===

  private async updateTimesheetRemoteType(
    request: RemoteWorkRequestResponseDto,
  ) {
    let timesheet = await this.prisma.time_sheets.findFirst({
      where: QueryUtil.onlyActive({
        user_id: request.user_id,
        work_date: request.work_date,
      }),
    });

    if (!timesheet) {
      timesheet = await this.prisma.time_sheets.create({
        data: {
          user_id: request.user_id,
          work_date: request.work_date,
          remote: request.remote_type,
          status: TimesheetStatus.PENDING,
          type: 'NORMAL',
        },
      });
    } else {
      await this.prisma.time_sheets.update({
        where: { id: timesheet.id },
        data: { remote: request.remote_type },
      });
    }
  }

  private async createTimesheetsForDayOff(dayOff: DayOffRequestResponseDto) {
    const startDate = new Date(dayOff.start_date);
    const endDate = new Date(dayOff.end_date);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const existingTimesheet = await this.prisma.time_sheets.findFirst({
        where: QueryUtil.onlyActive({
          user_id: dayOff.user_id,
          work_date: new Date(currentDate),
        }),
      });

      const workHours = this.calculateWorkHours(dayOff.duration);

      if (!existingTimesheet) {
        await this.prisma.time_sheets.create({
          data: {
            user_id: dayOff.user_id,
            work_date: new Date(currentDate),
            day_off_id: dayOff.id,
            status: 'APPROVED',
            type: 'NORMAL',
            work_time_morning: workHours.morningHours,
            work_time_afternoon: workHours.afternoonHours,
            total_work_time: workHours.totalHours,
            is_complete: dayOff.duration === 'FULL_DAY' ? false : true,
            paid_leave: dayOff.type === DayOffType.PAID ? dayOff.reason : null,
            unpaid_leave:
              dayOff.type === DayOffType.UNPAID ? dayOff.reason : null,
          },
        });
      } else {
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

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  private async updateTimesheetWithOvertime(
    request: OvertimeRequestResponseDto,
  ) {
    const timesheet = await this.prisma.time_sheets.findFirst({
      where: QueryUtil.onlyActive({
        user_id: request.user_id,
        work_date: request.date,
      }),
    });

    if (timesheet) {
      await this.prisma.time_sheets.update({
        where: { id: timesheet.id },
        data: { type: 'OVERTIME' },
      });
    } else {
      await this.prisma.time_sheets.create({
        data: {
          user_id: request.user_id,
          work_date: request.date,
          type: 'OVERTIME',
          status: 'APPROVED',
          total_work_time: (request.total || 0) * 60,
        },
      });
    }
  }

  private calculateWorkHours(duration: string) {
    switch (duration) {
      case 'FULL_DAY':
        return { morningHours: 0, afternoonHours: 0, totalHours: 0 };
      case 'MORNING':
        return { morningHours: 0, afternoonHours: 4 * 60, totalHours: 4 * 60 };
      case 'AFTERNOON':
        return { morningHours: 4 * 60, afternoonHours: 0, totalHours: 4 * 60 };
      default:
        return {
          morningHours: 4 * 60,
          afternoonHours: 4 * 60,
          totalHours: 8 * 60,
        };
    }
  }
}
