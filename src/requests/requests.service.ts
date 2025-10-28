import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DayOffStatus,
  DayOffType,
  RemoteType,
  TimesheetStatus,
} from '@prisma/client';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { PermissionCheckerService } from '../auth/services/permission-checker.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalanceService } from '../leave-management/services/leave-balance.service';
import { CreateDayOffRequestDto } from '../timesheet/dto/create-day-off-request.dto';
import { CreateOvertimeRequestDto } from '../timesheet/dto/create-overtime-request.dto';
import { CreateForgotCheckinRequestDto } from './dto/create-forgot-checkin-request.dto';
import { CreateLateEarlyRequestDto } from './dto/create-late-early-request.dto';
import { CreateRemoteWorkRequestDto } from './dto/create-remote-work-request.dto';
import {
  RemoteWorkRequestPaginationDto,
  RequestPaginationDto,
} from './dto/request-pagination.dto';
import { DayOffRequestResponseDto } from './dto/response/day-off-request-response.dto';
import { ForgotCheckinRequestResponseDto } from './dto/response/forgot-checkin-request-response.dto';
import { LateEarlyRequestResponseDto } from './dto/response/late-early-request-response.dto';
import { OvertimeRequestResponseDto } from './dto/response/overtime-request-response.dto';
import { RemoteWorkRequestResponseDto } from './dto/response/remote-work-request-response.dto';
import { ApprovalResult, RequestType } from './interfaces/request.interface';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly permissionChecker: PermissionCheckerService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // === COMMON UTILITIES ===

  private async validateUser(userId: number): Promise<void> {
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
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
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Đã có đơn xin làm việc từ xa cho ngày này',
      );
    }

    // Check day-off conflict
    const dayOff = await this.prisma.day_offs.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        status: 'APPROVED',
        deleted_at: null,
      },
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

    // Tìm hoặc tạo timesheet cho ngày đó
    let timesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
      },
    });

    if (!timesheet) {
      timesheet = await this.prisma.time_sheets.create({
        data: {
          user_id: dto.user_id,
          work_date: workDate,
          status: TimesheetStatus.PENDING,
          type: 'NORMAL',
        },
      });
    }

    // Cập nhật timesheet để đánh dấu có đơn xin làm từ xa
    await this.prisma.time_sheets.update({
      where: { id: timesheet.id },
      data: { has_remote_work_request: true },
    });

    const request = await this.prisma.remote_work_requests.create({
      data: {
        user_id: dto.user_id,
        work_date: workDate,
        remote_type: dto.remote_type,
        duration: dto.duration,
        title: dto.title,
        reason: dto.reason,
        status: TimesheetStatus.PENDING,
        timesheet_id: timesheet.id,
      },
    });

    // Log activity
    await this.activityLogService.logRequestCreated(
      'remote_work',
      request.id,
      dto.user_id,
      {
        work_date: workDate.toISOString(),
        remote_type: dto.remote_type,
        duration: dto.duration,
        title: dto.title,
      },
    );

    return request;
  }

  async findAllRemoteWorkRequests(
    paginationDto: RemoteWorkRequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { deleted_at: null };

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
          user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
          },
          approved_by_user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
          },
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

  async findMyRemoteWorkRequests(
    userId: number,
    paginationDto: RemoteWorkRequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { user_id: userId, deleted_at: null };

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
          user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
          },
          approved_by_user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
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

    const workDate = new Date(dto.work_date);

    // Check overlapping
    const existingDayOff = await this.prisma.day_offs.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
        status: { in: [DayOffStatus.PENDING, DayOffStatus.APPROVED] },
      },
    });

    if (existingDayOff) {
      throw new BadRequestException('Đã có đơn nghỉ phép trong ngày này');
    }

    // Tính số ngày nghỉ dựa trên duration
    const dayOffAmount = dto.duration === 'FULL_DAY' ? 1 : 0.5;

    // Kiểm tra leave balance cho phép có lương
    if (dto.type === DayOffType.PAID) {
      const leaveBalance =
        await this.leaveBalanceService.getOrCreateLeaveBalance(dto.user_id);

      if (leaveBalance.paid_leave_balance < dayOffAmount) {
        throw new BadRequestException(
          `Không đủ số dư phép có lương. Hiện có: ${leaveBalance.paid_leave_balance} ngày, cần: ${dayOffAmount} ngày`,
        );
      }
    }

    const { is_past, ...rest } = dto;

    return await this.prisma.day_offs.create({
      data: {
        ...rest,
        work_date: workDate,
        duration: dto.duration,
        type: dto.type,
        is_past: is_past ? true : false,
        status: 'PENDING',
      },
    });
  }

  async findAllDayOffRequests(paginationDto: RequestPaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { deleted_at: null };

    if (paginationDto.status) where.status = paginationDto.status;
    if (paginationDto.start_date && paginationDto.end_date) {
      where.work_date = {
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
          user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
          },
          approved_by_user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
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

  async findMyDayOffRequests(
    userId: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { user_id: userId };

    if (paginationDto.status) where.status = paginationDto.status;
    if (paginationDto.start_date && paginationDto.end_date) {
      where.work_date = {
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
          user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
          },
          approved_by_user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
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

  // === OVERTIME REQUESTS ===

  async createOvertimeRequest(
    dto: CreateOvertimeRequestDto,
  ): Promise<OvertimeRequestResponseDto> {
    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);

    // Validate project (bắt buộc theo UI)
    const project = await this.prisma.projects.findFirst({
      where: { id: dto.project_id, deleted_at: null },
    });
    if (!project) {
      throw new BadRequestException('Không tìm thấy dự án được chọn');
    }

    // Check existing overtime request for the same date
    const existingOvertime = await this.prisma.over_times_history.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
        status: { in: [TimesheetStatus.PENDING, TimesheetStatus.APPROVED] },
      },
    });

    if (existingOvertime) {
      throw new BadRequestException('Đã có đơn làm tăng ca cho ngày này');
    }

    // Calculate total hours from time strings
    const [startHour, startMinute] = dto.start_time.split(':').map(Number);
    const [endHour, endMinute] = dto.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const totalHours = (endMinutes - startMinutes) / 60;

    // Validate working hours (không thể làm tăng ca trong giờ hành chính)
    const normalWorkStart = 8 * 60; // 08:00
    const normalWorkEnd = 17 * 60; // 17:00

    if (startMinutes < normalWorkEnd && endMinutes > normalWorkStart) {
      throw new BadRequestException(
        'Thời gian tăng ca không được trùng với giờ hành chính (08:00 - 17:00)',
      );
    }

    // Tạm thời không tính toán rate phức tạp, để null hoặc 0
    const hourlyRate = null;
    const totalAmount = null;

    const result = await this.prisma.over_times_history.create({
      data: {
        user_id: dto.user_id,
        work_date: workDate,
        title: dto.title,
        start_time: new Date(
          `${workDate.toISOString().split('T')[0]} ${dto.start_time}`,
        ),
        end_time: new Date(
          `${workDate.toISOString().split('T')[0]} ${dto.end_time}`,
        ),
        total_hours: totalHours,
        hourly_rate: hourlyRate, // Tính từ bảng over_times và user level
        total_amount: totalAmount, // Tính từ total_hours * hourly_rate
        project_id: dto.project_id,
        reason: dto.reason,
        status: TimesheetStatus.PENDING,
      },
    });

    // Convert start_time and end_time from Date to string for response
    return {
      ...result,
      start_time: result.start_time.toTimeString().slice(0, 5), // HH:mm format
      end_time: result.end_time.toTimeString().slice(0, 5), // HH:mm format
    } as OvertimeRequestResponseDto;
  }

  async findAllOvertimeRequests(paginationDto: RequestPaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { deleted_at: null };

    if (paginationDto.status) where.status = paginationDto.status;
    if (paginationDto.start_date && paginationDto.end_date) {
      where.work_date = {
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
          user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
          },
          project: { select: { name: true, code: true } },
          approved_by_user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
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

  async findMyOvertimeRequests(
    userId: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { user_id: userId, deleted_at: null };

    if (paginationDto.status) where.status = paginationDto.status;
    if (paginationDto.start_date && paginationDto.end_date) {
      where.work_date = {
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
          user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
          },
          project: { select: { name: true, code: true } },
          approved_by_user: {
            select: {
              email: true,
              user_information: { select: { name: true } },
            },
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

  // === OVERVIEW METHODS ===

  /**
   * Lấy requests cho Division Head (chỉ trong division mình quản lý)
   */
  async getDivisionRequests(
    divisionHeadId: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    // 1. Validate user là Division Head
    await this.validateDivisionHead(divisionHeadId);

    // 2. Lấy division IDs của Division Head
    const divisionIds = await this.getUserDivisions(divisionHeadId);

    if (divisionIds.length === 0) {
      return buildPaginationResponse(
        [],
        0,
        paginationDto.page || 1,
        paginationDto.limit || 10,
      );
    }

    // 3. Lấy tất cả user trong divisions
    const divisionUserIds = await this.getDivisionUserIds(divisionIds);

    // 4. Query requests với filter division users
    return await this.getRequestsByUserIds(divisionUserIds, paginationDto);
  }

  /**
   * Lấy requests theo user IDs với pagination
   */
  async getRequestsByUserIds(
    userIds: number[],
    paginationDto: RequestPaginationDto = {},
  ) {
    if (userIds.length === 0) {
      return buildPaginationResponse(
        [],
        0,
        paginationDto.page || 1,
        paginationDto.limit || 10,
      );
    }

    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const whereConditions = this.buildWhereConditions(paginationDto);

    // Add user filter
    const userFilter = { user_id: { in: userIds } };

    // Get all requests from different tables with unified structure
    const [
      remoteWorkData,
      dayOffData,
      overtimeData,
      lateEarlyData,
      forgotCheckinData,
    ] = await Promise.all([
      this.prisma.remote_work_requests.findMany({
        where: {
          ...whereConditions,
          ...userFilter,
          ...(paginationDto.start_date &&
            paginationDto.end_date && {
              work_date: {
                gte: new Date(paginationDto.start_date),
                lte: new Date(paginationDto.end_date),
              },
            }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
          approved_by_user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.day_offs.findMany({
        where: {
          ...whereConditions,
          ...userFilter,
          ...(paginationDto.start_date &&
            paginationDto.end_date && {
              work_date: {
                gte: new Date(paginationDto.start_date),
                lte: new Date(paginationDto.end_date),
              },
            }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
          approved_by_user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.over_times_history.findMany({
        where: {
          ...whereConditions,
          ...userFilter,
          ...(paginationDto.start_date &&
            paginationDto.end_date && {
              work_date: {
                gte: new Date(paginationDto.start_date),
                lte: new Date(paginationDto.end_date),
              },
            }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  position: true,
                },
              },
            },
          },
          approved_by_user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.late_early_requests.findMany({
        where: {
          ...whereConditions,
          ...userFilter,
          ...(paginationDto.start_date &&
            paginationDto.end_date && {
              work_date: {
                gte: new Date(paginationDto.start_date),
                lte: new Date(paginationDto.end_date),
              },
            }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  position: true,
                },
              },
            },
          },
          approved_by_user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.forgot_checkin_requests.findMany({
        where: {
          ...whereConditions,
          ...userFilter,
          ...(paginationDto.start_date &&
            paginationDto.end_date && {
              work_date: {
                gte: new Date(paginationDto.start_date),
                lte: new Date(paginationDto.end_date),
              },
            }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  position: true,
                },
              },
            },
          },
          approved_by_user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    // Transform and combine all requests
    const allRequests = [
      ...remoteWorkData.map((req) => ({
        ...req,
        type: 'remote_work' as const,
      })),
      ...dayOffData.map((req) => ({
        ...req,
        type: 'day_off' as const,
      })),
      ...overtimeData.map((req) => ({
        ...req,
        type: 'overtime' as const,
      })),
      ...lateEarlyData.map((req) => ({
        ...req,
        type: 'late_early' as const,
      })),
      ...forgotCheckinData.map((req) => ({
        ...req,
        type: 'forgot_checkin' as const,
      })),
    ];

    // Sort by created_at desc
    allRequests.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Apply pagination
    const paginatedRequests = allRequests.slice(skip, skip + take);

    return buildPaginationResponse(
      paginatedRequests,
      allRequests.length,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getRequestById(
    requestId: number,
    requestType: string,
    requesterId?: number,
    requesterRoles?: string[],
  ) {
    let request;

    switch (requestType) {
      case 'remote_work':
      case 'remote-work':
        request = await this.prisma.remote_work_requests.findFirst({
          where: { id: requestId, deleted_at: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: {
                  select: {
                    name: true,
                    position: true,
                  },
                },
              },
            },
          },
        });
        break;

      case 'day_off':
      case 'day-off':
        request = await this.prisma.day_offs.findFirst({
          where: { id: requestId, deleted_at: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: {
                  select: {
                    name: true,
                    position: true,
                  },
                },
              },
            },
          },
        });
        break;

      case 'overtime':
        request = await this.prisma.time_sheets.findFirst({
          where: { id: requestId, deleted_at: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: {
                  select: {
                    name: true,
                    position: true,
                  },
                },
              },
            },
          },
        });
        break;

      case 'late_early':
      case 'late-early':
        request = await this.prisma.late_early_requests.findFirst({
          where: { id: requestId, deleted_at: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: {
                  select: {
                    name: true,
                    position: true,
                  },
                },
              },
            },
          },
        });
        break;

      case 'forgot_checkin':
      case 'forgot-checkin':
        request = await this.prisma.forgot_checkin_requests.findFirst({
          where: { id: requestId, deleted_at: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: {
                  select: {
                    name: true,
                    position: true,
                  },
                },
              },
            },
          },
        });
        break;

      default:
        throw new BadRequestException('Loại request không hợp lệ');
    }

    if (!request) {
      throw new NotFoundException('Không tìm thấy request');
    }

    // Kiểm tra quyền truy cập
    if (requesterId && requesterRoles) {
      const context = await this.permissionChecker.createUserContext(
        requesterId,
        requesterRoles,
      );
      const hasAccess = await this.permissionChecker.canAccessRequest(
        context,
        request.user_id,
        requestType,
      );

      if (!hasAccess) {
        throw new ForbiddenException('Không có quyền truy cập request này');
      }

      // Log request view activity
      await this.activityLogService.logRequestView(
        requestType,
        requestId,
        requesterId,
        request.user_id,
      );
    }

    return {
      ...request,
      type: requestType,
    };
  }

  async getAllRequests(
    paginationDto: RequestPaginationDto = {},
    requesterId?: number,
    requesterRole?: string,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    // Build where conditions for filtering
    const whereConditions = this.buildWhereConditions(paginationDto);

    // Apply role-based filtering
    let userIds: number[] | undefined;

    if (requesterRole === ROLE_NAMES.DIVISION_HEAD) {
      // Division Head chỉ xem requests trong division mình quản lý
      return await this.getDivisionRequests(requesterId!, paginationDto);
    } else if (
      requesterRole === ROLE_NAMES.ADMIN ||
      requesterRole === ROLE_NAMES.SUPER_ADMIN
    ) {
      // Admin có thể xem tất cả hoặc filter theo division_id
      if (paginationDto.division_id) {
        const divisionUserIds = await this.getDivisionUserIds([
          paginationDto.division_id,
        ]);
        userIds = divisionUserIds;
      }

      // Nếu admin chỉ muốn xem requests từ leads
      if (paginationDto.leads_only) {
        const leadUserIds = await this.getLeadUserIds(
          paginationDto.division_id,
        );
        userIds = userIds
          ? userIds.filter((id) => leadUserIds.includes(id))
          : leadUserIds;
      }
    } else {
      // Các role khác chỉ xem requests của chính mình
      userIds = [requesterId!];
    }

    // Nếu có filter theo role của requester
    if (paginationDto.requester_role) {
      const roleUserIds = await this.getUserIdsByRole(
        paginationDto.requester_role,
      );
      userIds = userIds
        ? userIds.filter((id) => roleUserIds.includes(id))
        : roleUserIds;
    }

    // Nếu có userIds filter, sử dụng method getRequestsByUserIds
    if (userIds && userIds.length > 0) {
      return await this.getRequestsByUserIds(userIds, paginationDto);
    } else if (userIds && userIds.length === 0) {
      // Không có user nào match filter
      return buildPaginationResponse(
        [],
        0,
        paginationDto.page || 1,
        paginationDto.limit || 10,
      );
    }

    if (paginationDto.status) {
      whereConditions.status = paginationDto.status;
    }

    const dateFilter =
      paginationDto.start_date && paginationDto.end_date
        ? {
            gte: new Date(paginationDto.start_date),
            lte: new Date(paginationDto.end_date),
          }
        : undefined;

    // Get all requests from different tables with unified structure
    const [
      remoteWorkData,
      dayOffData,
      overtimeData,
      lateEarlyData,
      forgotCheckinData,
    ] = await Promise.all([
      this.prisma.remote_work_requests.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.day_offs.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.over_times_history.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          project: { select: { name: true, code: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.late_early_requests.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.forgot_checkin_requests.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
    ]);

    // Combine and format all requests with type information
    const allRequests = [
      ...remoteWorkData.map((req) => ({
        ...req,
        request_type: 'REMOTE_WORK' as const,
      })),
      ...dayOffData.map((req) => ({
        ...req,
        request_type: 'DAY_OFF' as const,
      })),
      ...overtimeData.map((req) => ({
        ...req,
        request_type: 'OVERTIME' as const,
        start_time: req.start_time?.toTimeString().slice(0, 5),
        end_time: req.end_time?.toTimeString().slice(0, 5),
      })),
      ...lateEarlyData.map((req) => ({
        ...req,
        request_type: 'LATE_EARLY' as const,
      })),
      ...forgotCheckinData.map((req) => ({
        ...req,
        request_type: 'FORGOT_CHECKIN' as const,
        checkin_time: req.checkin_time?.toTimeString().slice(0, 5) || null,
        checkout_time: req.checkout_time?.toTimeString().slice(0, 5) || null,
      })),
    ];

    // Sort by created_at desc (or other criteria)
    const sortField =
      orderBy && typeof orderBy === 'object' && orderBy.created_at
        ? 'created_at'
        : 'created_at';
    const sortOrder =
      orderBy && typeof orderBy === 'object' && orderBy.created_at === 'asc'
        ? 'asc'
        : 'desc';

    allRequests.sort((a, b) => {
      const aDate = new Date(a[sortField]).getTime();
      const bDate = new Date(b[sortField]).getTime();
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    });

    // Apply pagination to the combined results
    const total = allRequests.length;
    const paginatedRequests = allRequests.slice(skip, skip + take);

    return buildPaginationResponse(
      paginatedRequests,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getAllMyRequests(
    userId: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    // Build where conditions for filtering
    const whereConditions: any = { user_id: userId, deleted_at: null };

    if (paginationDto.status) {
      whereConditions.status = paginationDto.status;
    }

    const dateFilter =
      paginationDto.start_date && paginationDto.end_date
        ? {
            gte: new Date(paginationDto.start_date),
            lte: new Date(paginationDto.end_date),
          }
        : undefined;

    // Get all requests from different tables with unified structure
    const [
      remoteWorkData,
      dayOffData,
      overtimeData,
      lateEarlyData,
      forgotCheckinData,
    ] = await Promise.all([
      this.prisma.remote_work_requests.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.day_offs.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.over_times_history.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          project: { select: { name: true, code: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.late_early_requests.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.forgot_checkin_requests.findMany({
        where: {
          ...whereConditions,
          ...(dateFilter && { work_date: dateFilter }),
        },
        include: {
          user: { select: { id: true, email: true } },
          approved_by_user: { select: { id: true, email: true } },
        },
      }),
    ]);

    // Combine and format all requests with type information
    const allRequests = [
      ...remoteWorkData.map((req) => ({
        ...req,
        request_type: 'REMOTE_WORK' as const,
      })),
      ...dayOffData.map((req) => ({
        ...req,
        request_type: 'DAY_OFF' as const,
      })),
      ...overtimeData.map((req) => ({
        ...req,
        request_type: 'OVERTIME' as const,
        start_time: req.start_time?.toTimeString().slice(0, 5),
        end_time: req.end_time?.toTimeString().slice(0, 5),
      })),
      ...lateEarlyData.map((req) => ({
        ...req,
        request_type: 'LATE_EARLY' as const,
      })),
      ...forgotCheckinData.map((req) => ({
        ...req,
        request_type: 'FORGOT_CHECKIN' as const,
        checkin_time: req.checkin_time?.toTimeString().slice(0, 5) || null,
        checkout_time: req.checkout_time?.toTimeString().slice(0, 5) || null,
      })),
    ];

    // Sort by created_at desc (or other criteria)
    const sortField =
      orderBy && typeof orderBy === 'object' && orderBy.created_at
        ? 'created_at'
        : 'created_at';
    const sortOrder =
      orderBy && typeof orderBy === 'object' && orderBy.created_at === 'asc'
        ? 'asc'
        : 'desc';

    allRequests.sort((a, b) => {
      const aDate = new Date(a[sortField]).getTime();
      const bDate = new Date(b[sortField]).getTime();
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    });

    // Apply pagination to the combined results
    const total = allRequests.length;
    const paginatedRequests = allRequests.slice(skip, skip + take);

    return buildPaginationResponse(
      paginatedRequests,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getMyRequestsStats(userId: number) {
    const [remoteWork, dayOffs, overtimes, lateEarly, forgotCheckin] =
      await Promise.all([
        this.prisma.remote_work_requests.groupBy({
          by: ['status'],
          where: { user_id: userId, deleted_at: null },
          _count: { status: true },
        }),
        this.prisma.day_offs.groupBy({
          by: ['status'],
          where: { user_id: userId, deleted_at: null },
          _count: { status: true },
        }),
        this.prisma.over_times_history.groupBy({
          by: ['status'],
          where: { user_id: userId, deleted_at: null },
          _count: { status: true },
        }),
        this.prisma.late_early_requests.groupBy({
          by: ['status'],
          where: { user_id: userId, deleted_at: null },
          _count: { status: true },
        }),
        this.prisma.forgot_checkin_requests.groupBy({
          by: ['status'],
          where: { user_id: userId, deleted_at: null },
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
    const lateEarlyStats = getStatusCounts(lateEarly);
    const forgotCheckinStats = getStatusCounts(forgotCheckin);

    return {
      total:
        remoteWorkStats.total +
        dayOffStats.total +
        overtimeStats.total +
        lateEarlyStats.total +
        forgotCheckinStats.total,
      pending:
        remoteWorkStats.pending +
        dayOffStats.pending +
        overtimeStats.pending +
        lateEarlyStats.pending +
        forgotCheckinStats.pending,
      approved:
        remoteWorkStats.approved +
        dayOffStats.approved +
        overtimeStats.approved +
        lateEarlyStats.approved +
        forgotCheckinStats.approved,
      rejected:
        remoteWorkStats.rejected +
        dayOffStats.rejected +
        overtimeStats.rejected +
        lateEarlyStats.rejected +
        forgotCheckinStats.rejected,
      by_type: {
        [RequestType.REMOTE_WORK]: remoteWorkStats,
        [RequestType.DAY_OFF]: dayOffStats,
        [RequestType.OVERTIME]: overtimeStats,
        [RequestType.LATE_EARLY]: lateEarlyStats,
        [RequestType.FORGOT_CHECKIN]: forgotCheckinStats,
      },
    };
  }

  // === PRIVATE APPROVAL METHODS ===

  private async approveRemoteWorkRequest(
    id: number,
    approverId: number,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.remote_work_requests.findFirst({
      where: { id, deleted_at: null },
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
      where: { id, deleted_at: null },
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
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy day-off request');
    }

    if (request.status !== DayOffStatus.PENDING) {
      throw new BadRequestException(
        `Không thể duyệt request ở trạng thái: ${request.status}`,
      );
    }

    // Sử dụng transaction để đảm bảo data consistency
    return await this.prisma.$transaction(async (tx) => {
      // Cập nhật request status
      const updatedRequest = await tx.day_offs.update({
        where: { id },
        data: {
          status: DayOffStatus.APPROVED,
          approved_by: approverId,
          approved_at: new Date(),
        },
      });

      // Trừ leave balance cho phép có lương
      if (request.type === DayOffType.PAID) {
        const dayOffAmount = request.duration === 'FULL_DAY' ? 1 : 0.5;
        await this.leaveBalanceService.deductLeaveBalance(
          request.user_id,
          dayOffAmount,
          DayOffType.PAID,
          request.id,
          `Sử dụng phép: ${request.reason || 'Nghỉ phép'}`,
        );
      }

      // Auto create timesheets
      await this.createTimesheetsForDayOff(updatedRequest);

      return {
        success: true,
        message: 'Đã duyệt day-off request thành công',
        data: updatedRequest,
      };
    });
  }

  private async rejectDayOffRequest(
    id: number,
    rejectorId: number,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.day_offs.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy day-off request');
    }

    if (
      request.status !== DayOffStatus.PENDING &&
      request.status !== DayOffStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Không thể từ chối request ở trạng thái: ${request.status}`,
      );
    }

    // Sử dụng transaction để đảm bảo data consistency
    return await this.prisma.$transaction(async (tx) => {
      // Cập nhật request status
      const updatedRequest = await tx.day_offs.update({
        where: { id },
        data: {
          status: DayOffStatus.REJECTED,
          rejected_reason: reason,
          updated_at: new Date(),
        },
      });

      // Hoàn trả leave balance nếu đã được duyệt trước đó (và đã trừ balance)
      if (
        request.status === DayOffStatus.APPROVED &&
        request.type === DayOffType.PAID
      ) {
        const dayOffAmount = request.duration === 'FULL_DAY' ? 1 : 0.5;
        await this.leaveBalanceService.refundLeaveBalance(
          request.user_id,
          dayOffAmount,
          DayOffType.PAID,
          request.id,
          `Hoàn trả phép do từ chối đơn: ${reason}`,
        );
      }

      return {
        success: true,
        message: 'Đã từ chối day-off request',
        data: updatedRequest,
      };
    });
  }

  private async approveOvertimeRequest(
    id: number,
    approverId: number,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.over_times_history.findFirst({
      where: { id, deleted_at: null },
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

    // Note: Timesheet update logic can be added here if needed

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
      where: { id, deleted_at: null },
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
    // Tìm timesheet thông qua liên kết trực tiếp
    const remoteRequest = await this.prisma.remote_work_requests.findFirst({
      where: { id: request.id, deleted_at: null },
      include: { timesheet: true },
    });

    if (remoteRequest?.timesheet) {
      // Cập nhật timesheet với thông tin remote work đã được duyệt
      await this.prisma.time_sheets.update({
        where: { id: remoteRequest.timesheet.id },
        data: {
          remote: request.remote_type,
          remote_work_approved: true,
        },
      });
    } else {
      // Fallback: tìm theo user_id và work_date (trường hợp cũ)
      let timesheet = await this.prisma.time_sheets.findFirst({
        where: {
          user_id: request.user_id,
          work_date: request.work_date,
          deleted_at: null,
        },
      });

      if (!timesheet) {
        timesheet = await this.prisma.time_sheets.create({
          data: {
            user_id: request.user_id,
            work_date: request.work_date,
            remote: request.remote_type,
            status: TimesheetStatus.PENDING,
            type: 'NORMAL',
            has_remote_work_request: true,
            remote_work_approved: true,
          },
        });
      } else {
        await this.prisma.time_sheets.update({
          where: { id: timesheet.id },
          data: {
            remote: request.remote_type,
            remote_work_approved: true,
          },
        });
      }

      // Cập nhật remote request với timesheet_id
      await this.prisma.remote_work_requests.update({
        where: { id: request.id },
        data: { timesheet_id: timesheet.id },
      });
    }
  }

  private async createTimesheetsForDayOff(dayOff: DayOffRequestResponseDto) {
    const workDate = new Date(dayOff.work_date);

    const existingTimesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: dayOff.user_id,
        work_date: workDate,
        deleted_at: null,
      },
    });

    // Calculate work hours based on duration
    const workHours =
      dayOff.duration === 'FULL_DAY'
        ? { morningHours: 0, afternoonHours: 0, totalHours: 0 }
        : dayOff.duration === 'MORNING'
          ? { morningHours: 0, afternoonHours: 4 * 60, totalHours: 4 * 60 }
          : { morningHours: 4 * 60, afternoonHours: 0, totalHours: 4 * 60 };

    if (!existingTimesheet) {
      await this.prisma.time_sheets.create({
        data: {
          user_id: dayOff.user_id,
          work_date: workDate,
          day_off_id: dayOff.id,
          status: 'APPROVED',
          type: 'NORMAL',
          work_time_morning: workHours.morningHours,
          work_time_afternoon: workHours.afternoonHours,
          total_work_time: workHours.totalHours,
          is_complete: dayOff.duration === 'FULL_DAY' ? false : true,
          // paid_leave và unpaid_leave info được lấy từ day_off relation
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
          // paid_leave và unpaid_leave info được lấy từ day_off relation
        },
      });
    }
  }

  // === LEAVE BALANCE METHODS ===

  /**
   * Lấy thông tin leave balance của user
   */
  async getMyLeaveBalance(userId: number) {
    await this.validateUser(userId);
    return await this.leaveBalanceService.getLeaveBalanceStats(userId);
  }

  /**
   * Lấy lịch sử giao dịch leave balance
   */
  async getMyLeaveTransactionHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0,
  ) {
    await this.validateUser(userId);
    return await this.leaveBalanceService.getLeaveTransactionHistory(
      userId,
      limit,
      offset,
    );
  }

  /**
   * Kiểm tra có đủ leave balance để tạo đơn không
   */
  async checkLeaveBalanceAvailability(
    userId: number,
    leaveType: DayOffType,
    requestedDays: number,
  ) {
    await this.validateUser(userId);

    const balance =
      await this.leaveBalanceService.getOrCreateLeaveBalance(userId);

    let availableDays = 0;
    let balanceType = '';

    if (leaveType === DayOffType.PAID) {
      availableDays = balance.paid_leave_balance;
      balanceType = 'phép có lương';
    } else {
      availableDays = balance.unpaid_leave_balance;
      balanceType = 'phép không lương';
    }

    const isAvailable = availableDays >= requestedDays;

    return {
      available: isAvailable,
      current_balance: availableDays,
      requested_days: requestedDays,
      remaining_after_request: isAvailable
        ? availableDays - requestedDays
        : availableDays,
      balance_type: balanceType,
      message: isAvailable
        ? `Đủ số dư ${balanceType}`
        : `Không đủ số dư ${balanceType}. Hiện có: ${availableDays}, cần: ${requestedDays}`,
    };
  }

  // === LATE/EARLY REQUEST METHODS ===

  async createLateEarlyRequest(
    dto: CreateLateEarlyRequestDto,
  ): Promise<LateEarlyRequestResponseDto> {
    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);

    // Check existing request for the same date
    const existingRequest = await this.prisma.late_early_requests.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Đã có request đi muộn/về sớm cho ngày này',
      );
    }

    // Validate minutes based on request type
    if (dto.request_type === 'LATE' && !dto.late_minutes) {
      throw new BadRequestException('Số phút đi muộn là bắt buộc');
    }
    if (dto.request_type === 'EARLY' && !dto.early_minutes) {
      throw new BadRequestException('Số phút về sớm là bắt buộc');
    }
    if (
      dto.request_type === 'BOTH' &&
      (!dto.late_minutes || !dto.early_minutes)
    ) {
      throw new BadRequestException(
        'Cả số phút đi muộn và về sớm đều là bắt buộc',
      );
    }

    // Tìm và cập nhật timesheet để đánh dấu có đơn xin đi muộn về sớm
    const timesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
      },
    });

    if (timesheet) {
      await this.prisma.time_sheets.update({
        where: { id: timesheet.id },
        data: { has_late_early_request: true },
      });
    }

    const result = await this.prisma.late_early_requests.create({
      data: {
        user_id: dto.user_id,
        work_date: workDate,
        request_type: dto.request_type,
        title: dto.title,
        late_minutes: dto.late_minutes || undefined,
        early_minutes: dto.early_minutes || undefined,
        reason: dto.reason,
        status: 'PENDING',
        timesheet_id: timesheet?.id,
      },
    });

    return {
      ...result,
      late_minutes: result.late_minutes ?? undefined,
      early_minutes: result.early_minutes ?? undefined,
    } as LateEarlyRequestResponseDto;
  }

  async findAllLateEarlyRequests(
    paginationDto: RequestPaginationDto = {},
  ): Promise<any> {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { deleted_at: null };

    if (paginationDto.status) where.status = paginationDto.status;
    if (paginationDto.start_date && paginationDto.end_date) {
      where.work_date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    const [requests, total] = await Promise.all([
      this.prisma.late_early_requests.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          approved_by_user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: orderBy || { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.late_early_requests.count({ where }),
    ]);

    return buildPaginationResponse(
      requests,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getLateEarlyRequests(
    userId?: number,
    paginationDto: RequestPaginationDto = {},
  ): Promise<any> {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereClause = { user_id: userId, deleted_at: null };

    const [requests, total] = await Promise.all([
      this.prisma.late_early_requests.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          approved_by_user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: orderBy || { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.late_early_requests.count({ where: whereClause }),
    ]);

    return buildPaginationResponse(
      requests,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findMyLateEarlyRequests(
    userId: number,
    paginationDto: RequestPaginationDto = {},
  ): Promise<any> {
    return this.getLateEarlyRequests(userId, paginationDto);
  }

  async approveLateEarlyRequest(
    id: number,
    approverId: number,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.late_early_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy late/early request');
    }

    const updatedRequest = await this.prisma.late_early_requests.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_by: approverId,
        approved_at: new Date(),
      },
    });

    // TODO: Tích hợp với timesheet - cập nhật approved late/early time
    await this.updateTimesheetWithApprovedLateEarly(updatedRequest);

    return {
      success: true,
      message: 'Đã duyệt late/early request thành công',
      data: updatedRequest,
    };
  }

  async rejectLateEarlyRequest(
    id: number,
    approverId: number,
    rejectedReason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.late_early_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy late/early request');
    }

    const updatedRequest = await this.prisma.late_early_requests.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by: approverId,
        approved_at: new Date(),
        rejected_reason: rejectedReason,
      },
    });

    return {
      success: true,
      message: 'Đã từ chối late/early request thành công',
      data: updatedRequest,
    };
  }

  private async updateTimesheetWithApprovedLateEarly(
    request: any,
  ): Promise<void> {
    // Tìm timesheet tương ứng
    const timesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: request.user_id,
        work_date: request.work_date,
        deleted_at: null,
      },
    });

    if (timesheet) {
      // Cập nhật approved late/early time
      const updateData: any = {};

      if (request.late_minutes) {
        updateData.late_time_approved = request.late_minutes;
      }

      if (request.early_minutes) {
        updateData.early_time_approved = request.early_minutes;
      }

      // Đánh dấu đơn đi muộn về sớm đã được duyệt
      updateData.late_early_approved = true;

      if (Object.keys(updateData).length > 0) {
        await this.prisma.time_sheets.update({
          where: { id: timesheet.id },
          data: updateData,
        });
      }

      // Link request với timesheet
      await this.prisma.late_early_requests.update({
        where: { id: request.id },
        data: { timesheet_id: timesheet.id },
      });
    }
  }

  // === UNIVERSAL APPROVE/REJECT METHODS ===

  async approveRequest(
    type: RequestType,
    id: number,
    approverId: number,
  ): Promise<ApprovalResult> {
    switch (type) {
      case RequestType.DAY_OFF:
        return await this.approveDayOffRequest(id, approverId);
      case RequestType.OVERTIME:
        return await this.approveOvertimeRequest(id, approverId);
      case RequestType.REMOTE_WORK:
        return await this.approveRemoteWorkRequest(id, approverId);
      case RequestType.LATE_EARLY:
        return await this.approveLateEarlyRequest(id, approverId);
      case RequestType.FORGOT_CHECKIN:
        return await this.approveForgotCheckinRequest(id, approverId);
      default:
        throw new BadRequestException(`Loại request không hợp lệ: ${type}`);
    }
  }

  async rejectRequest(
    type: RequestType,
    id: number,
    approverId: number,
    rejectedReason: string,
  ): Promise<ApprovalResult> {
    switch (type) {
      case RequestType.DAY_OFF:
        return await this.rejectDayOffRequest(id, approverId, rejectedReason);
      case RequestType.OVERTIME:
        return await this.rejectOvertimeRequest(id, approverId, rejectedReason);
      case RequestType.REMOTE_WORK:
        return await this.rejectRemoteWorkRequest(
          id,
          approverId,
          rejectedReason,
        );
      case RequestType.LATE_EARLY:
        return await this.rejectLateEarlyRequest(
          id,
          approverId,
          rejectedReason,
        );
      case RequestType.FORGOT_CHECKIN:
        return await this.rejectForgotCheckinRequest(
          id,
          approverId,
          rejectedReason,
        );
      default:
        throw new BadRequestException(`Loại request không hợp lệ: ${type}`);
    }
  }

  // ==================== FORGOT CHECKIN REQUESTS ====================

  async createForgotCheckinRequest(
    dto: CreateForgotCheckinRequestDto,
  ): Promise<ForgotCheckinRequestResponseDto> {
    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);
    this.validatePastOrCurrentDate(workDate);

    // Kiểm tra đơn đã tồn tại
    const existingRequest = await this.prisma.forgot_checkin_requests.findFirst(
      {
        where: {
          user_id: dto.user_id,
          work_date: workDate,
          deleted_at: null,
        },
      },
    );

    if (existingRequest) {
      throw new BadRequestException(
        'Đã có đơn xin bổ sung chấm công cho ngày này',
      );
    }

    // Validate thời gian checkin/checkout
    if (dto.checkin_time && dto.checkout_time) {
      const checkinTime = new Date(
        `${workDate.toISOString().split('T')[0]} ${dto.checkin_time}`,
      );
      const checkoutTime = new Date(
        `${workDate.toISOString().split('T')[0]} ${dto.checkout_time}`,
      );

      if (checkoutTime <= checkinTime) {
        throw new BadRequestException(
          'Thời gian checkout phải sau thời gian checkin',
        );
      }
    }

    // Tìm timesheet của ngày đó
    const timesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
      },
    });

    // Cập nhật timesheet để đánh dấu có đơn xin bổ sung chấm công
    if (timesheet) {
      await this.prisma.time_sheets.update({
        where: { id: timesheet.id },
        data: { has_forgot_checkin_request: true },
      });
    }

    const checkinDateTime = dto.checkin_time
      ? new Date(`${workDate.toISOString().split('T')[0]} ${dto.checkin_time}`)
      : null;
    const checkoutDateTime = dto.checkout_time
      ? new Date(`${workDate.toISOString().split('T')[0]} ${dto.checkout_time}`)
      : null;

    const result = await this.prisma.forgot_checkin_requests.create({
      data: {
        user_id: dto.user_id,
        work_date: workDate,
        checkin_time: checkinDateTime,
        checkout_time: checkoutDateTime,
        title: dto.title,
        reason: dto.reason,
        status: TimesheetStatus.PENDING,
        timesheet_id: timesheet?.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
        approved_by_user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
      },
    });

    return {
      ...result,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.user_information?.name || '',
      },
      approved_by_user: {
        id: result.approved_by_user?.id || 0,
        email: result.approved_by_user?.email || '',
        name: result.approved_by_user?.user_information?.name || '',
      },
      work_date: result.work_date.toISOString().split('T')[0],
      checkin_time: result.checkin_time?.toTimeString().slice(0, 5) || null,
      checkout_time: result.checkout_time?.toTimeString().slice(0, 5) || null,
      approved_at: result.approved_at?.toISOString() || null,
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
    };
  }

  async findAllForgotCheckinRequests(paginationDto: RequestPaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: any = { deleted_at: null };

    if (paginationDto.status) {
      whereConditions.status = paginationDto.status;
    }

    if (paginationDto.start_date && paginationDto.end_date) {
      whereConditions.work_date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    const [requests, total] = await Promise.all([
      this.prisma.forgot_checkin_requests.findMany({
        where: whereConditions,
        include: {
          user: {
            select: { id: true, email: true },
          },
          approved_by_user: {
            select: { id: true, email: true },
          },
        },
        skip,
        take,
        orderBy,
      }),
      this.prisma.forgot_checkin_requests.count({
        where: whereConditions,
      }),
    ]);

    const mappedRequests = requests.map((request) => ({
      ...request,
      work_date: request.work_date.toISOString().split('T')[0],
      checkin_time: request.checkin_time?.toTimeString().slice(0, 5) || null,
      checkout_time: request.checkout_time?.toTimeString().slice(0, 5) || null,
      approved_at: request.approved_at?.toISOString() || null,
      created_at: request.created_at.toISOString(),
      updated_at: request.updated_at.toISOString(),
    }));

    return buildPaginationResponse(
      mappedRequests,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findMyForgotCheckinRequests(
    userId: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: any = {
      user_id: userId,
      deleted_at: null,
    };

    if (paginationDto.status) {
      whereConditions.status = paginationDto.status;
    }

    if (paginationDto.start_date && paginationDto.end_date) {
      whereConditions.work_date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    const [requests, total] = await Promise.all([
      this.prisma.forgot_checkin_requests.findMany({
        where: whereConditions,
        include: {
          user: {
            select: { id: true, email: true },
          },
          approved_by_user: {
            select: { id: true, email: true },
          },
        },
        skip,
        take,
        orderBy,
      }),
      this.prisma.forgot_checkin_requests.count({
        where: whereConditions,
      }),
    ]);

    const mappedRequests = requests.map((request) => ({
      ...request,
      work_date: request.work_date.toISOString().split('T')[0],
      checkin_time: request.checkin_time?.toTimeString().slice(0, 5) || null,
      checkout_time: request.checkout_time?.toTimeString().slice(0, 5) || null,
      approved_at: request.approved_at?.toISOString() || null,
      created_at: request.created_at.toISOString(),
      updated_at: request.updated_at.toISOString(),
    }));

    return buildPaginationResponse(
      mappedRequests,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async approveForgotCheckinRequest(
    id: number,
    approverId: number,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.forgot_checkin_requests.findFirst({
      where: { id, deleted_at: null },
      include: {
        timesheet: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy đơn xin bổ sung chấm công');
    }

    if (request.status !== TimesheetStatus.PENDING) {
      throw new BadRequestException('Đơn này đã được xử lý');
    }

    await this.prisma.$transaction(async (prisma) => {
      // Cập nhật trạng thái đơn
      await prisma.forgot_checkin_requests.update({
        where: { id },
        data: {
          status: TimesheetStatus.APPROVED,
          approved_by: approverId,
          approved_at: new Date(),
        },
      });

      // Cập nhật timesheet nếu có
      if (
        request.timesheet_id &&
        (request.checkin_time || request.checkout_time)
      ) {
        const updateData: any = {
          forgot_checkin_approved: true,
        };

        if (request.checkin_time) {
          updateData.checkin = request.checkin_time;
        }

        if (request.checkout_time) {
          updateData.checkout = request.checkout_time;
        }

        await prisma.time_sheets.update({
          where: { id: request.timesheet_id },
          data: updateData,
        });
      }
    });

    return {
      success: true,
      message: 'Duyệt đơn xin bổ sung chấm công thành công',
    };
  }

  async rejectForgotCheckinRequest(
    id: number,
    approverId: number,
    rejectedReason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.forgot_checkin_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy đơn xin bổ sung chấm công');
    }

    if (request.status !== TimesheetStatus.PENDING) {
      throw new BadRequestException('Đơn này đã được xử lý');
    }

    await this.prisma.forgot_checkin_requests.update({
      where: { id },
      data: {
        status: TimesheetStatus.REJECTED,
        approved_by: approverId,
        approved_at: new Date(),
        rejected_reason: rejectedReason,
      },
    });

    return {
      success: true,
      message: 'Từ chối đơn xin bổ sung chấm công thành công',
    };
  }

  private validatePastOrCurrentDate(date: Date) {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today

    if (date > today) {
      throw new BadRequestException(
        'Không thể tạo đơn xin bổ sung chấm công cho ngày tương lai',
      );
    }
  }

  // === ROLE-BASED ACCESS HELPER METHODS ===

  /**
   * Validate user là Division Head
   */
  private async validateDivisionHead(userId: number): Promise<void> {
    const userInfo = await this.prisma.user_information.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      include: {
        role: {
          select: { name: true },
        },
      },
    });

    const isDivisionHead = userInfo?.role?.name === ROLE_NAMES.DIVISION_HEAD;

    if (!isDivisionHead) {
      throw new ForbiddenException('Chỉ Division Head mới có quyền truy cập');
    }
  }

  /**
   * Lấy danh sách division IDs mà user quản lý
   */
  private async getUserDivisions(userId: number): Promise<number[]> {
    const userDivisions = await this.prisma.user_division.findMany({
      where: {
        userId: userId,
        division: {
          deleted_at: null,
        },
      },
      select: {
        divisionId: true,
      },
    });

    return userDivisions
      .map((ud) => ud.divisionId)
      .filter((id) => id !== null) as number[];
  }

  /**
   * Lấy danh sách user IDs trong các divisions
   */
  private async getDivisionUserIds(divisionIds: number[]): Promise<number[]> {
    const divisionUsers = await this.prisma.user_division.findMany({
      where: {
        divisionId: { in: divisionIds },
        user: {
          deleted_at: null,
        },
      },
      select: {
        userId: true,
      },
    });

    return [...new Set(divisionUsers.map((du) => du.userId))];
  }

  /**
   * Lấy danh sách user IDs có role là lead (team_leader, division_head, project_manager)
   */
  private async getLeadUserIds(divisionId?: number): Promise<number[]> {
    const leadRoles = [
      ROLE_NAMES.TEAM_LEADER,
      ROLE_NAMES.DIVISION_HEAD,
      ROLE_NAMES.PROJECT_MANAGER,
    ];

    const whereConditions: any = {
      deleted_at: null,
      role: {
        name: { in: leadRoles },
      },
      user: {
        deleted_at: null,
      },
    };

    // Nếu có filter theo division
    if (divisionId) {
      whereConditions.user = {
        ...whereConditions.user,
        user_division: {
          some: {
            divisionId: divisionId,
          },
        },
      };
    }

    const leadUsers = await this.prisma.user_information.findMany({
      where: whereConditions,
      select: {
        user_id: true,
      },
    });

    return [...new Set(leadUsers.map((lu) => lu.user_id))];
  }

  /**
   * Lấy danh sách user IDs theo role name
   */
  private async getUserIdsByRole(roleName: string): Promise<number[]> {
    const roleUsers = await this.prisma.user_information.findMany({
      where: {
        deleted_at: null,
        role: {
          name: roleName,
        },
        user: {
          deleted_at: null,
        },
      },
      select: {
        user_id: true,
      },
    });

    return [...new Set(roleUsers.map((ru) => ru.user_id))];
  }

  /**
   * Build where conditions từ pagination DTO
   */
  private buildWhereConditions(paginationDto: RequestPaginationDto): any {
    const whereConditions: any = { deleted_at: null };

    if (paginationDto.status) {
      whereConditions.status = paginationDto.status;
    }

    return whereConditions;
  }
}
