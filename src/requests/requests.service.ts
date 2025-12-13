import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  DayOffType,
  Prisma,
  RemoteType,
  ScopeType,
} from '@prisma/client';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import {
  PROJECT_ERRORS,
  REQUEST_ERRORS,
  SUCCESS_MESSAGES,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import { ActivityLogService } from '../common/services/activity-log.service';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalanceService } from '../leave-management/services/leave-balance.service';
import { TimesheetService } from '../timesheet/timesheet.service';
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
import { AuthorizationContext } from '../auth/services/authorization-context.service';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly timesheetService: TimesheetService,
    private readonly activityLogService: ActivityLogService,
    private readonly roleAssignmentService: RoleAssignmentService,
  ) {}

    private async validateUser(user_id: number): Promise<void> {
    const user = await this.prisma.users.findFirst({
      where: { id: user_id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
      throw new BadRequestException(REQUEST_ERRORS.INVALID_TIME_RANGE);
    }
  }

  private validateFutureDate(date: Date, allowPast = false): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!allowPast && date < today) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_CREATE_PAST_DATE);
    }
  }

    async createRemoteWorkRequest(
    dto: CreateRemoteWorkRequestDto,
  ): Promise<RemoteWorkRequestResponseDto> {
    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);
    this.validateFutureDate(workDate, false);

    const existingRequest = await this.prisma.remote_work_requests.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);
    }

    const dayOff = await this.prisma.day_offs.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        status: 'APPROVED',
        deleted_at: null,
      },
    });

    if (dayOff) {
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);
    }

    if (dto.remote_type === RemoteType.OFFICE) {
      throw new BadRequestException(REQUEST_ERRORS.INVALID_REQUEST_TYPE);
    }

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
          status: ApprovalStatus.PENDING,
          type: 'NORMAL',
        },
      });
    }

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
        status: ApprovalStatus.PENDING,
        timesheet_id: timesheet.id,
      },
    });

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
    user_id: number,
  ) {
    const accessScope = await this.determineAccessScope(user_id);

    let user_idsFilter: number[] | undefined;

    if (accessScope.type === 'DIVISION_ONLY') {
      if (accessScope.division_ids && accessScope.division_ids.length > 0) {
        user_idsFilter = await this.getDivisionuser_ids(accessScope.division_ids);
      } else {
        user_idsFilter = [];
      }
    } else if (accessScope.type === 'ADMIN_ACCESS') {
      const divisionHeaduser_ids = await this.getuser_idsByRole(
        ROLE_NAMES.DIVISION_HEAD,
      );
      user_idsFilter = [user_id, ...divisionHeaduser_ids];
    }

    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: Prisma.remote_work_requestsWhereInput = { deleted_at: null };

    if (user_idsFilter !== undefined) {
      if (user_idsFilter.length === 0) {
        return buildPaginationResponse(
          [],
          0,
          paginationDto.page || 1,
          paginationDto.limit || 10,
        );
      }
      where.user_id = { in: user_idsFilter };
    }

    if (paginationDto.status)
      where.status = paginationDto.status as ApprovalStatus;
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
    user_id: number,
    paginationDto: RemoteWorkRequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { user_id: user_id, deleted_at: null };

    if (paginationDto.status)
      where.status = paginationDto.status as ApprovalStatus;
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

    async createDayOffRequest(
    dto: CreateDayOffRequestDto,
  ): Promise<DayOffRequestResponseDto> {
    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);

    const existingDayOff = await this.prisma.day_offs.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
      },
    });

    if (existingDayOff) {
      throw new BadRequestException(REQUEST_ERRORS.DAY_OFF_ALREADY_EXISTS);
    }

    const dayOffAmount = dto.duration === 'FULL_DAY' ? 1 : 0.5;

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

  async findAllDayOffRequests(
    paginationDto: RequestPaginationDto = {},
    user_id?: number,
  ) {
    let user_idsFilter: number[] | undefined;

    if (user_id) {
      user_idsFilter = await this.getuser_idsFilterByRole(user_id);

      if (user_idsFilter !== undefined && user_idsFilter.length === 0) {
        return buildPaginationResponse(
          [],
          0,
          paginationDto.page || 1,
          paginationDto.limit || 10,
        );
      }
    }

    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: Prisma.day_offsWhereInput = { deleted_at: null };

    if (user_idsFilter !== undefined) {
      where.user_id = { in: user_idsFilter };
    }

    if (paginationDto.status)
      where.status = paginationDto.status as ApprovalStatus;
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
    user_id: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { user_id: user_id };

    if (paginationDto.status)
      where.status = paginationDto.status as ApprovalStatus;
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

    async createOvertimeRequest(
    dto: CreateOvertimeRequestDto,
  ): Promise<OvertimeRequestResponseDto> {
    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);

    const project = await this.prisma.projects.findFirst({
      where: { id: dto.project_id, deleted_at: null },
    });
    if (!project) {
      throw new BadRequestException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    const existingOvertime = await this.prisma.over_times_history.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
      },
    });

    if (existingOvertime) {
      throw new BadRequestException(REQUEST_ERRORS.OVERTIME_ALREADY_EXISTS);
    }

    const [startHour, startMinute] = dto.start_time.split(':').map(Number);
    const [endHour, endMinute] = dto.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const totalHours = (endMinutes - startMinutes) / 60;

    const normalWorkStart = 8 * 60;
    const normalWorkEnd = 17 * 60;

    if (startMinutes < normalWorkEnd && endMinutes > normalWorkStart) {
      throw new BadRequestException(REQUEST_ERRORS.OVERTIME_OVERLAP_WORK_HOURS);
    }

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
        hourly_rate: hourlyRate,
        total_amount: totalAmount,
        project_id: dto.project_id,
        reason: dto.reason,
        status: ApprovalStatus.PENDING,
      },
    });

    return {
      ...result,
      start_time: result.start_time.toTimeString().slice(0, 5),
      end_time: result.end_time.toTimeString().slice(0, 5),
    } as OvertimeRequestResponseDto;
  }

  async findAllOvertimeRequests(
    paginationDto: RequestPaginationDto = {},
    user_id?: number,
  ) {
    let user_idsFilter: number[] | undefined;

    if (user_id) {
      user_idsFilter = await this.getuser_idsFilterByRole(user_id);

      if (user_idsFilter !== undefined && user_idsFilter.length === 0) {
        return buildPaginationResponse(
          [],
          0,
          paginationDto.page || 1,
          paginationDto.limit || 10,
        );
      }
    }

    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: Prisma.over_times_historyWhereInput = { deleted_at: null };

    if (user_idsFilter !== undefined) {
      where.user_id = { in: user_idsFilter };
    }

    if (paginationDto.status)
      where.status = paginationDto.status as ApprovalStatus;
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
    user_id: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: any = { user_id: user_id, deleted_at: null };

    if (paginationDto.status)
      where.status = paginationDto.status as ApprovalStatus;
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

    /**
   * Lấy requests cho Division Head (chỉ trong division mình quản lý)
   */
  async getDivisionRequests(
    divisionHeadId: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    await this.validateDivisionHead(divisionHeadId);

    const division_ids = await this.getUserDivisions(divisionHeadId);

    if (division_ids.length === 0) {
      return buildPaginationResponse(
        [],
        0,
        paginationDto.page || 1,
        paginationDto.limit || 10,
      );
    }

    const divisionuser_ids = await this.getDivisionuser_ids(division_ids);

    return await this.getRequestsByuser_ids(divisionuser_ids, paginationDto);
  }

  /**
   * Lấy requests theo user IDs với pagination
   */
  async getRequestsByuser_ids(
    user_ids: number[],
    paginationDto: RequestPaginationDto = {},
  ) {
    if (user_ids.length === 0) {
      return buildPaginationResponse(
        [],
        0,
        paginationDto.page || 1,
        paginationDto.limit || 10,
      );
    }

    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const whereConditions = this.buildWhereConditions(paginationDto);

    const userFilter = { user_id: { in: user_ids } };

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

    allRequests.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

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
    authContext: AuthorizationContext,
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
        throw new BadRequestException(REQUEST_ERRORS.INVALID_REQUEST_TYPE);
    }

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.REQUEST_NOT_FOUND);
    }

    const canView = await authContext.canApproveRequest(request.user_id, requestType);
    const isOwnRequest = authContext.userId === request.user_id;
    
    if (!canView && !isOwnRequest) {
      throw new ForbiddenException(
        'Bạn không có quyền xem request này. ' +
        'Chỉ có thể xem requests trong scope quản lý hoặc của chính mình.'
      );
    }

    await this.activityLogService.logRequestView(
      requestType,
      requestId,
      authContext.userId,
      request.user_id,
    );

    return {
      ...request,
      type: requestType,
    };
  }

  async getAllRequests(
    paginationDto: RequestPaginationDto = {},
    requesterId?: number,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const accessScope = await this.determineAccessScope(requesterId!);

    const roleBasedConditions = await this.buildRoleBasedWhereConditions(
      accessScope,
      paginationDto,
    );

    let user_ids: number[] | undefined;

    if (accessScope.type === 'DIVISION_ONLY') {
      if (accessScope.division_ids && accessScope.division_ids.length > 0) {
        const divisionuser_ids = await this.getDivisionuser_ids(
          accessScope.division_ids,
        );
        user_ids = divisionuser_ids;
      } else {
        return buildPaginationResponse(
          [],
          0,
          paginationDto.page || 1,
          paginationDto.limit || 10,
        );
      }
    } else if (accessScope.type === 'ADMIN_ACCESS') {
      const divisionHeaduser_ids = await this.getuser_idsByRole(
        ROLE_NAMES.DIVISION_HEAD,
      );

      user_ids = [accessScope.user_id!, ...divisionHeaduser_ids];
    } else if (accessScope.type === 'ALL_ACCESS') {
      if (paginationDto.division_id) {
        const divisionuser_ids = await this.getDivisionuser_ids([
          paginationDto.division_id,
        ]);
        user_ids = divisionuser_ids;
      }
    } else if (accessScope.type === 'TEAM_ONLY') {
      if (accessScope.team_ids && accessScope.team_ids.length > 0) {
        const teamuser_ids = await this.getTeamuser_ids(accessScope.team_ids);
        user_ids = teamuser_ids;
      } else {
        user_ids = [requesterId!];
      }
    } else if (accessScope.type === 'PROJECT_ONLY') {
      if (accessScope.projectIds && accessScope.projectIds.length > 0) {
        const projectuser_ids = await this.getProjectUserIds(accessScope.projectIds);
        user_ids = projectuser_ids;
      } else {
        user_ids = [requesterId!];
      }
    } else {
      user_ids = [requesterId!];
    }

    if (paginationDto.requester_role) {
      const roleuser_ids = await this.getuser_idsByRole(
        paginationDto.requester_role,
      );
      user_ids = user_ids
        ? user_ids.filter((id) => roleuser_ids.includes(id))
        : roleuser_ids;
    }

    if (user_ids && user_ids.length > 0) {
      const result = await this.getRequestsByuser_ids(user_ids, paginationDto);

      return {
        ...result,
        metadata: {
          access_scope: accessScope.type,
          managed_divisions: accessScope.division_ids,
          managed_teams: accessScope.team_ids,
          managed_projects: accessScope.projectIds,
          filters_applied: {
            division_restriction: accessScope.type === 'DIVISION_ONLY',
            team_restriction: accessScope.type === 'TEAM_ONLY',
            project_restriction: accessScope.type === 'PROJECT_ONLY',
            division_id: paginationDto.division_id,
            requester_role: paginationDto.requester_role,
          },
        },
      };
    } else if (user_ids && user_ids.length === 0) {
      return {
        ...buildPaginationResponse(
          [],
          0,
          paginationDto.page || 1,
          paginationDto.limit || 10,
        ),
        metadata: {
          access_scope: accessScope.type,
          managed_divisions: accessScope.division_ids,
          managed_teams: accessScope.team_ids,
          managed_projects: accessScope.projectIds,
          filters_applied: {
            division_restriction: accessScope.type === 'DIVISION_ONLY',
            team_restriction: accessScope.type === 'TEAM_ONLY',
            project_restriction: accessScope.type === 'PROJECT_ONLY',
          },
        },
      };
    }

    return {
      ...buildPaginationResponse(
        [],
        0,
        paginationDto.page || 1,
        paginationDto.limit || 10,
      ),
      metadata: {
        access_scope: accessScope.type,
        managed_divisions: accessScope.division_ids,
        managed_teams: accessScope.team_ids,
        managed_projects: accessScope.projectIds,
        filters_applied: {
          division_restriction: accessScope.type === 'DIVISION_ONLY',
          team_restriction: accessScope.type === 'TEAM_ONLY',
          project_restriction: accessScope.type === 'PROJECT_ONLY',
        },
      },
    };
  }


  async getAllMyRequests(
    user_id: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: any = { user_id: user_id, deleted_at: null };

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

    const sortField =
      orderBy && typeof orderBy === 'object' && orderBy.created_at
        ? 'created_at'
        : 'created_at';
    const sort_order =
      orderBy && typeof orderBy === 'object' && orderBy.created_at === 'asc'
        ? 'asc'
        : 'desc';

    allRequests.sort((a, b) => {
      const aDate = new Date(a[sortField]).getTime();
      const bDate = new Date(b[sortField]).getTime();
      return sort_order === 'asc' ? aDate - bDate : bDate - aDate;
    });

    const total = allRequests.length;
    const paginatedRequests = allRequests.slice(skip, skip + take);

    return buildPaginationResponse(
      paginatedRequests,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getMyRequestsStats(user_id: number) {
    const [remoteWork, dayOffs, overtimes, lateEarly, forgotCheckin] =
      await Promise.all([
        this.prisma.remote_work_requests.groupBy({
          by: ['status'],
          where: { user_id: user_id, deleted_at: null },
          _count: { status: true },
        }),
        this.prisma.day_offs.groupBy({
          by: ['status'],
          where: { user_id: user_id, deleted_at: null },
          _count: { status: true },
        }),
        this.prisma.over_times_history.groupBy({
          by: ['status'],
          where: { user_id: user_id, deleted_at: null },
          _count: { status: true },
        }),
        this.prisma.late_early_requests.groupBy({
          by: ['status'],
          where: { user_id: user_id, deleted_at: null },
          _count: { status: true },
        }),
        this.prisma.forgot_checkin_requests.groupBy({
          by: ['status'],
          where: { user_id: user_id, deleted_at: null },
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

  private async approveRemoteWorkRequest(
    id: number,
    authContext: AuthorizationContext,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.remote_work_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.REMOTE_WORK_REQUEST_NOT_FOUND);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_APPROVE_NON_PENDING);
    }

    const canApprove = await authContext.canApproveRequest(
      request.user_id,
      'remote-work',
    );

    if (!canApprove) {
      throw new ForbiddenException(
        'Bạn không có quyền duyệt request này. ' +
        'Chỉ có thể duyệt requests của users trong scope quản lý của bạn.',
      );
    }

    const updatedRequest = await this.prisma.remote_work_requests.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        approved_by: authContext.userId,
        approved_at: new Date(),
      },
    });

    await this.updateTimesheetRemoteType(updatedRequest);

    return {
      success: true,
      message: SUCCESS_MESSAGES.REMOTE_WORK_APPROVED,
      data: updatedRequest,
    };
  }

  private async rejectRemoteWorkRequest(
    id: number,
    authContext: AuthorizationContext,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.remote_work_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.REMOTE_WORK_REQUEST_NOT_FOUND);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_REJECT_NON_PENDING);
    }

    // Scope-aware permission check
    const canReject = await authContext.canApproveRequest(
      request.user_id,
      'remote-work',
    );

    if (!canReject) {
      throw new ForbiddenException(
        'Bạn không có quyền từ chối request này. ' +
        'Chỉ có thể từ chối requests của users trong scope quản lý của bạn.',
      );
    }

    const updatedRequest = await this.prisma.remote_work_requests.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        rejected_reason: reason,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      message: SUCCESS_MESSAGES.REMOTE_WORK_REJECTED,
      data: updatedRequest,
    };
  }

  private async approveDayOffRequest(
    id: number,
    authContext: AuthorizationContext,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.day_offs.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.DAY_OFF_REQUEST_NOT_FOUND);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_APPROVE_NON_PENDING);
    }

    const canApprove = await authContext.canApproveRequest(
      request.user_id,
      'day-off',
    );

    if (!canApprove) {
      throw new ForbiddenException(
        'Bạn không có quyền duyệt đơn nghỉ phép này. ' +
        'Chỉ có thể duyệt đơn của users trong scope quản lý của bạn.',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.day_offs.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          approved_by: authContext.userId,
          approved_at: new Date(),
        },
      });

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

      await this.createTimesheetsForDayOff(updatedRequest);

      return {
        success: true,
        message: SUCCESS_MESSAGES.DAY_OFF_APPROVED,
        data: updatedRequest,
      };
    });
  }

  private async rejectDayOffRequest(
    id: number,
    authContext: AuthorizationContext,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.day_offs.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.DAY_OFF_REQUEST_NOT_FOUND);
    }

    if (
      request.status !== ApprovalStatus.PENDING &&
      request.status !== ApprovalStatus.APPROVED
    ) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_REJECT_NON_PENDING);
    }

    // Scope-aware permission check
    const canReject = await authContext.canApproveRequest(
      request.user_id,
      'day-off',
    );

    if (!canReject) {
      throw new ForbiddenException(
        'Bạn không có quyền từ chối đơn nghỉ phép này. ' +
        'Chỉ có thể từ chối đơn của users trong scope quản lý của bạn.',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.day_offs.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          rejected_reason: reason,
          updated_at: new Date(),
        },
      });

      if (
        request.status === ApprovalStatus.APPROVED &&
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
        message: SUCCESS_MESSAGES.DAY_OFF_REJECTED,
        data: updatedRequest,
      };
    });
  }

  private async approveOvertimeRequest(
    id: number,
    authContext: AuthorizationContext,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.over_times_history.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.OVERTIME_REQUEST_NOT_FOUND);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_APPROVE_NON_PENDING);
    }

    const canApprove = await authContext.canApproveRequest(
      request.user_id,
      'overtime',
    );

    if (!canApprove) {
      throw new ForbiddenException(
        'Bạn không có quyền duyệt đơn làm thêm giờ này. ' +
        'Chỉ có thể duyệt đơn của users trong scope quản lý của bạn.',
      );
    }

    const updatedRequest = await this.prisma.over_times_history.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        approved_by: authContext.userId,
        approved_at: new Date(),
      },
    });

    return {
      success: true,
      message: SUCCESS_MESSAGES.OVERTIME_APPROVED,
      data: updatedRequest,
    };
  }

  private async rejectOvertimeRequest(
    id: number,
    authContext: AuthorizationContext,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.over_times_history.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.OVERTIME_REQUEST_NOT_FOUND);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_REJECT_NON_PENDING);
    }

    const canReject = await authContext.canApproveRequest(
      request.user_id,
      'overtime',
    );

    if (!canReject) {
      throw new ForbiddenException(
        'Bạn không có quyền từ chối đơn làm thêm giờ này. ' +
        'Chỉ có thể từ chối đơn của users trong scope quản lý của bạn.',
      );
    }

    const updatedRequest = await this.prisma.over_times_history.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        rejected_reason: reason,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      message: SUCCESS_MESSAGES.OVERTIME_REJECTED,
      data: updatedRequest,
    };
  }

    private async updateTimesheetRemoteType(
    request: RemoteWorkRequestResponseDto,
  ) {
    const remoteRequest = await this.prisma.remote_work_requests.findFirst({
      where: { id: request.id, deleted_at: null },
      include: { timesheet: true },
    });

    if (remoteRequest?.timesheet) {
      await this.prisma.time_sheets.update({
        where: { id: remoteRequest.timesheet.id },
        data: {
          remote: request.remote_type,
          remote_work_approved: true,
        },
      });
    } else {
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
            status: ApprovalStatus.PENDING,
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
          status: 'APPROVED',
          type: 'NORMAL',
          work_time_morning: workHours.morningHours,
          work_time_afternoon: workHours.afternoonHours,
          total_work_time: workHours.totalHours,
          is_complete: dayOff.duration === 'FULL_DAY' ? false : true,
        },
      });
    } else {
      await this.prisma.time_sheets.update({
        where: { id: existingTimesheet.id },
        data: {
          work_time_morning: workHours.morningHours,
          work_time_afternoon: workHours.afternoonHours,
          total_work_time: workHours.totalHours,
        },
      });
    }
  }

    /**
   * Lấy thông tin leave balance của user
   */
  async getMyLeaveBalance(user_id: number) {
    await this.validateUser(user_id);
    return await this.leaveBalanceService.getLeaveBalanceStats(user_id);
  }



  /**
   * Kiểm tra có đủ leave balance để tạo đơn không
   */
  async checkLeaveBalanceAvailability(
    user_id: number,
    leaveType: DayOffType,
    requestedDays: number,
  ) {
    await this.validateUser(user_id);

    const balance =
      await this.leaveBalanceService.getOrCreateLeaveBalance(user_id);

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

    async createLateEarlyRequest(
    dto: CreateLateEarlyRequestDto,
  ): Promise<LateEarlyRequestResponseDto> {
    await this.validateUser(dto.user_id);

    // Tính tổng số phút của request này
    const totalRequestMinutes = (dto.late_minutes || 0) + (dto.early_minutes || 0);

    // Validate request quota (bao gồm số phút sẽ tạo)
    await this.timesheetService.validateRequestQuota(dto.user_id, 'late_early', totalRequestMinutes);

    const workDate = new Date(dto.work_date);

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
    user_id?: number,
  ) {
    let user_idsFilter: number[] | undefined;

    if (user_id) {
      user_idsFilter = await this.getuser_idsFilterByRole(user_id);

      if (user_idsFilter !== undefined && user_idsFilter.length === 0) {
        return buildPaginationResponse(
          [],
          0,
          paginationDto.page || 1,
          paginationDto.limit || 10,
        );
      }
    }

    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const where: Prisma.late_early_requestsWhereInput = { deleted_at: null };

    if (user_idsFilter !== undefined) {
      where.user_id = { in: user_idsFilter };
    }

    if (paginationDto.status)
      where.status = paginationDto.status as ApprovalStatus;
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
    user_id?: number,
    paginationDto: RequestPaginationDto = {},
  ): Promise<any> {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereClause = { user_id: user_id, deleted_at: null };

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
    user_id: number,
    paginationDto: RequestPaginationDto = {},
  ): Promise<any> {
    return this.getLateEarlyRequests(user_id, paginationDto);
  }

  async approveLateEarlyRequest(
    id: number,
    authContext: AuthorizationContext,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.late_early_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.REQUEST_NOT_FOUND);
    }

    // Scope-aware permission check
    const canApprove = await authContext.canApproveRequest(
      request.user_id,
      'late-early',
    );

    if (!canApprove) {
      throw new ForbiddenException(
        'Bạn không có quyền duyệt request late/early này. ' +
        'Chỉ có thể duyệt requests của users trong scope quản lý của bạn.',
      );
    }

    const updatedRequest = await this.prisma.late_early_requests.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_by: authContext.userId,
        approved_at: new Date(),
      },
    });

    await this.updateTimesheetWithApprovedLateEarly(updatedRequest);

    return {
      success: true,
      message: SUCCESS_MESSAGES.OPERATION_SUCCESSFUL,
      data: updatedRequest,
    };
  }

  async rejectLateEarlyRequest(
    id: number,
    authContext: AuthorizationContext,
    rejectedReason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.late_early_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.REQUEST_NOT_FOUND);
    }

    // Scope-aware permission check
    const canReject = await authContext.canApproveRequest(
      request.user_id,
      'late-early',
    );

    if (!canReject) {
      throw new ForbiddenException(
        'Bạn không có quyền từ chối request late/early này. ' +
        'Chỉ có thể từ chối requests của users trong scope quản lý của bạn.',
      );
    }

    const updatedRequest = await this.prisma.late_early_requests.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by: authContext.userId,
        approved_at: new Date(),
        rejected_reason: rejectedReason,
      },
    });

    return {
      success: true,
      message: SUCCESS_MESSAGES.OPERATION_SUCCESSFUL,
      data: updatedRequest,
    };
  }

  private async updateTimesheetWithApprovedLateEarly(
    request: any,
  ): Promise<void> {
    const timesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: request.user_id,
        work_date: request.work_date,
        deleted_at: null,
      },
    });

    if (timesheet) {
      const updateData: any = {};

      if (request.late_minutes) {
        updateData.late_time_approved = request.late_minutes;
      }

      if (request.early_minutes) {
        updateData.early_time_approved = request.early_minutes;
      }

      updateData.late_early_approved = true;

      if (Object.keys(updateData).length > 0) {
        await this.prisma.time_sheets.update({
          where: { id: timesheet.id },
          data: updateData,
        });
      }

      await this.prisma.late_early_requests.update({
        where: { id: request.id },
        data: { timesheet_id: timesheet.id },
      });
    }
  }

  /**
   * Approve request với scope-aware authorization
   * @param type - Request type
   * @param id - Request ID
   * @param authContext - Authorization context với scope information
   */
  async approveRequest(
    type: RequestType,
    id: number,
    authContext: AuthorizationContext,
  ): Promise<ApprovalResult> {
    switch (type) {
      case RequestType.DAY_OFF:
        return await this.approveDayOffRequest(id, authContext);
      case RequestType.OVERTIME:
        return await this.approveOvertimeRequest(id, authContext);
      case RequestType.REMOTE_WORK:
        return await this.approveRemoteWorkRequest(id, authContext);
      case RequestType.LATE_EARLY:
        return await this.approveLateEarlyRequest(id, authContext);
      case RequestType.FORGOT_CHECKIN:
        return await this.approveForgotCheckinRequest(id, authContext);
      default:
        throw new BadRequestException(REQUEST_ERRORS.INVALID_REQUEST_TYPE);
    }
  }

  /**
   * Reject request với scope-aware authorization
   * @param type - Request type
   * @param id - Request ID
   * @param authContext - Authorization context với scope information
   * @param rejectedReason - Lý do từ chối
   */
  async rejectRequest(
    type: RequestType,
    id: number,
    authContext: AuthorizationContext,
    rejectedReason: string,
  ): Promise<ApprovalResult> {
    switch (type) {
      case RequestType.DAY_OFF:
        return await this.rejectDayOffRequest(id, authContext, rejectedReason);
      case RequestType.OVERTIME:
        return await this.rejectOvertimeRequest(id, authContext, rejectedReason);
      case RequestType.REMOTE_WORK:
        return await this.rejectRemoteWorkRequest(id, authContext, rejectedReason);
      case RequestType.LATE_EARLY:
        return await this.rejectLateEarlyRequest(id, authContext, rejectedReason);
      case RequestType.FORGOT_CHECKIN:
        return await this.rejectForgotCheckinRequest(id, authContext, rejectedReason);
      default:
        throw new BadRequestException(REQUEST_ERRORS.INVALID_REQUEST_TYPE);
    }
  }


  async createForgotCheckinRequest(
    dto: CreateForgotCheckinRequestDto,
  ): Promise<ForgotCheckinRequestResponseDto> {
    await this.validateUser(dto.user_id);

    // Validate request quota
    await this.timesheetService.validateRequestQuota(dto.user_id, 'forgot_checkin');

    const workDate = new Date(dto.work_date);
    this.validatePastOrCurrentDate(workDate);

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
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);
    }

    if (dto.checkin_time && dto.checkout_time) {
      const checkin_time = new Date(
        `${workDate.toISOString().split('T')[0]} ${dto.checkin_time}`,
      );
      const checkout_time = new Date(
        `${workDate.toISOString().split('T')[0]} ${dto.checkout_time}`,
      );

      if (checkout_time <= checkin_time) {
        throw new BadRequestException(REQUEST_ERRORS.INVALID_TIME_RANGE);
      }
    }

    const timesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
      },
    });

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
        status: ApprovalStatus.PENDING,
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

  async findAllForgotCheckinRequests(
    paginationDto: RequestPaginationDto = {},
    user_id?: number,
  ) {
    let user_idsFilter: number[] | undefined;

    if (user_id) {
      user_idsFilter = await this.getuser_idsFilterByRole(user_id);

      if (user_idsFilter !== undefined && user_idsFilter.length === 0) {
        return buildPaginationResponse(
          [],
          0,
          paginationDto.page || 1,
          paginationDto.limit || 10,
        );
      }
    }

    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: Prisma.forgot_checkin_requestsWhereInput = {
      deleted_at: null,
    };

    if (user_idsFilter !== undefined) {
      whereConditions.user_id = { in: user_idsFilter };
    }

    if (paginationDto.status) {
      whereConditions.status = paginationDto.status as ApprovalStatus;
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
    user_id: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: any = {
      user_id: user_id,
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
    authContext: AuthorizationContext,
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

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Đơn này đã được xử lý');
    }

    // Scope-aware permission check
    const canApprove = await authContext.canApproveRequest(
      request.user_id,
      'forgot-checkin',
    );

    if (!canApprove) {
      throw new ForbiddenException(
        'Bạn không có quyền duyệt đơn bổ sung chấm công này. ' +
        'Chỉ có thể duyệt đơn của users trong scope quản lý của bạn.',
      );
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.forgot_checkin_requests.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          approved_by: authContext.userId,
          approved_at: new Date(),
        },
      });

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
    authContext: AuthorizationContext,
    rejectedReason: string,
  ): Promise<ApprovalResult> {
    const request = await this.prisma.forgot_checkin_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy đơn xin bổ sung chấm công');
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Đơn này đã được xử lý');
    }

    // Scope-aware permission check
    const canReject = await authContext.canApproveRequest(
      request.user_id,
      'forgot-checkin',
    );

    if (!canReject) {
      throw new ForbiddenException(
        'Bạn không có quyền từ chối đơn bổ sung chấm công này. ' +
        'Chỉ có thể từ chối đơn của users trong scope quản lý của bạn.',
      );
    }

    await this.prisma.forgot_checkin_requests.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        approved_by: authContext.userId,
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

    /**
   * Validate user là Division Head
   */
  private async validateDivisionHead(user_id: number): Promise<void> {
    const userInfo = await this.prisma.users.findUnique({
      where: { id: user_id },
      select: {
        user_information: {
          select: { id: true },
        },
      },
    });

    const userRoles = await this.roleAssignmentService.getUserRoles(user_id);
    const isDivisionHead = userRoles.roles.some(
      (role) =>
        role.name === ROLE_NAMES.DIVISION_HEAD &&
        role.scope_type === ScopeType.DIVISION,
    );

    if (!isDivisionHead) {
      throw new ForbiddenException('Chỉ Division Head mới có quyền truy cập');
    }
  }

  private async getUserDivisions(user_id: number): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: user_id,
        scope_type: ScopeType.DIVISION,
        deleted_at: null,
        scope_id: { not: null },
      },
      select: {
        scope_id: true,
      },
    });

    return assignments
      .map((a) => a.scope_id)
      .filter((id): id is number => id !== null);
  }

  private async getDivisionuser_ids(division_ids: number[]): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.DIVISION,
        scope_id: { in: division_ids },
        deleted_at: null,
      },
      select: {
        user_id: true,
      },
      distinct: ['user_id'],
    });

    return assignments.map((a) => a.user_id);
  }

  /**
   * Lấy danh sách user IDs có role là lead (team_leader, division_head, project_manager)
   */
  private async getLeaduser_ids(division_id?: number): Promise<number[]> {
    const leadRoles = [
      ROLE_NAMES.TEAM_LEADER,
      ROLE_NAMES.DIVISION_HEAD,
      ROLE_NAMES.PROJECT_MANAGER,
    ];

    const whereConditions: any = {
      deleted_at: null,
      user: {
        deleted_at: null,
      },
    };

    if (division_id) {
      const assignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.DIVISION,
          scope_id: division_id,
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      const user_ids = assignments.map((a) => a.user_id);
      whereConditions.user_id = { in: user_ids };
    }

    const leadUsers = await this.prisma.users.findMany({
      where: {
        user_information: whereConditions,
      },
      select: {
        id: true,
      },
    });

    return [...new Set(leadUsers.map((lu) => lu.id))];
  }

  private async getuser_idsByRole(role_name: string): Promise<number[]> {
    const roleUsers = await this.prisma.user_role_assignment.findMany({
      where: {
        role: {
          name: role_name,
          deleted_at: null,
        },
        deleted_at: null,
      },
      select: {
        user_id: true,
      },
    });

    return [...new Set(roleUsers.map((r) => r.user_id))];
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


  private async getUserManagedDivisions(user_id: number): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: user_id,
        scope_type: ScopeType.DIVISION,
        deleted_at: null,
        scope_id: { not: null },
        role: {
          name: ROLE_NAMES.DIVISION_HEAD,
          deleted_at: null,
        },
      },
      select: {
        scope_id: true,
      },
    });

    return [
      ...new Set(
        assignments
          .map((a) => a.scope_id)
          .filter((id): id is number => id !== null),
      ),
    ];
  }

  private async getuser_idsFilterByRole(
    user_id: number,
  ): Promise<number[] | undefined> {
    const accessScope = await this.determineAccessScope(user_id);

    if (accessScope.type === 'DIVISION_ONLY') {
      if (accessScope.division_ids && accessScope.division_ids.length > 0) {
        return await this.getDivisionuser_ids(accessScope.division_ids);
      }
      return [];
    }

    if (accessScope.type === 'ADMIN_ACCESS') {
      const divisionHeaduser_ids = await this.getuser_idsByRole(
        ROLE_NAMES.DIVISION_HEAD,
      );
      return [user_id, ...divisionHeaduser_ids];
    }

    if (accessScope.type === 'TEAM_ONLY') {
      if (accessScope.team_ids && accessScope.team_ids.length > 0) {
        return await this.getTeamuser_ids(accessScope.team_ids);
      }
      return [user_id];
    }

    if (accessScope.type === 'PROJECT_ONLY') {
      if (accessScope.projectIds && accessScope.projectIds.length > 0) {
        return await this.getProjectUserIds(accessScope.projectIds);
      }
      return [user_id];
    }

    if (accessScope.type === 'SELF_ONLY') {
      return [user_id];
    }

    return undefined;
  }

  // DEPRECATED: Replaced by AuthorizationContext.canApproveRequest()
  // Kept temporarily for backward compatibility with old code paths
  // TODO: Remove after verifying all endpoints migrated
  private async canApproveRequest(
    approverId: number,
    requestUserId: number,
  ): Promise<boolean> {
    // Lấy roles từ DB - không tin parameter từ controller
    const [approverRoles, ownerRoles] = await Promise.all([
      this.roleAssignmentService.getUserRoles(approverId),
      this.roleAssignmentService.getUserRoles(requestUserId),
    ]);

    const isAdmin = approverRoles.roles.some((r) => r.name === ROLE_NAMES.ADMIN);
    
    // Admin có thể approve TẤT CẢ (kể cả chính mình)
    if (isAdmin) {
      // Log nếu là self-approval để audit
      if (approverId === requestUserId) {
        await this.activityLogService.logAdminSelfApproval(approverId, {
          message: 'Admin self-approved their request',
          timestamp: new Date(),
        });
      }
      return true;
    }

    // Không cho phép self-approval với non-admin roles
    if (approverId === requestUserId) {
      return false;
    }

    // Division Head: Approve trong division của mình
    const approverDivisions = approverRoles.roles
      .filter((r) => r.name === ROLE_NAMES.DIVISION_HEAD && r.scope_type === 'DIVISION')
      .map((r) => r.scope_id);

    if (approverDivisions.length > 0) {
      const ownerInSameDivision = ownerRoles.roles.some(
        (r) => r.scope_type === 'DIVISION' && approverDivisions.includes(r.scope_id),
      );
      if (ownerInSameDivision) {
        return true;
      }
    }

    // Team Leader: Approve trong team của mình
    const approverTeams = approverRoles.roles
      .filter((r) => r.name === ROLE_NAMES.TEAM_LEADER && r.scope_type === 'TEAM')
      .map((r) => r.scope_id);

    if (approverTeams.length > 0) {
      const ownerInSameTeam = ownerRoles.roles.some(
        (r) => r.scope_type === 'TEAM' && approverTeams.includes(r.scope_id),
      );
      if (ownerInSameTeam) {
        return true;
      }
    }

    // Project Manager: Approve members trong project của mình
    const approverProjects = approverRoles.roles
      .filter((r) => r.name === ROLE_NAMES.PROJECT_MANAGER && r.scope_type === 'PROJECT')
      .map((r) => r.scope_id)
      .filter((id): id is number => id !== undefined);

    if (approverProjects.length > 0) {
      const projects = await this.prisma.projects.findMany({
        where: {
          id: { in: approverProjects },
          deleted_at: null,
        },
        select: { team_id: true },
      });

      const projectTeamIds = projects
        .map((p) => p.team_id)
        .filter((id): id is number => id !== null);

      if (projectTeamIds.length > 0) {
        const ownerInProjectTeam = ownerRoles.roles.some(
          (r) => r.scope_type === 'TEAM' && r.scope_id !== undefined && projectTeamIds.includes(r.scope_id),
        );
        if (ownerInProjectTeam) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * REFACTORED: Tự lấy roles từ DB và xử lý MULTIPLE roles
   * Không nhận role parameter từ controller nữa
   */
  private async determineAccessScope(
    user_id: number,
  ): Promise<{
    type:
      | 'DIVISION_ONLY'
      | 'ALL_ACCESS'
      | 'PROJECT_ONLY'
      | 'TEAM_ONLY'
      | 'SELF_ONLY'
      | 'ADMIN_ACCESS'
      | 'COMBINED';
    division_ids?: number[];
    projectIds?: number[];
    team_ids?: number[];
    user_id?: number;
  }> {
    // Lấy TẤT CẢ roles từ DB
    const userRoles = await this.roleAssignmentService.getUserRoles(user_id);
    
    // Check Admin first (highest priority)
    const isAdmin = userRoles.roles.some(r => r.name === ROLE_NAMES.ADMIN);
    if (isAdmin) {
      return {
        type: 'ALL_ACCESS',
        user_id: user_id,
      };
    }

    // Collect all scopes from ALL roles user has
    const managedDivisions = userRoles.roles
      .filter(r => r.name === ROLE_NAMES.DIVISION_HEAD && r.scope_type === 'DIVISION')
      .map(r => r.scope_id)
      .filter((id): id is number => id !== null);

    const managedTeams = userRoles.roles
      .filter(r => r.name === ROLE_NAMES.TEAM_LEADER && r.scope_type === 'TEAM')
      .map(r => r.scope_id)
      .filter((id): id is number => id !== null);

    const managedProjects = userRoles.roles
      .filter(r => r.name === ROLE_NAMES.PROJECT_MANAGER && r.scope_type === 'PROJECT')
      .map(r => r.scope_id)
      .filter((id): id is number => id !== null);

    // Determine access type based on roles
    // Division Head has highest scope after Admin
    if (managedDivisions.length > 0) {
      return {
        type: 'DIVISION_ONLY',
        division_ids: managedDivisions,
        team_ids: managedTeams, // Include teams too if has both roles
        projectIds: managedProjects,
      };
    }

    // If user has both Team Leader and Project Manager
    if (managedTeams.length > 0 || managedProjects.length > 0) {
      return {
        type: managedTeams.length > 0 ? 'TEAM_ONLY' : 'PROJECT_ONLY',
        team_ids: managedTeams,
        projectIds: managedProjects,
      };
    }

    // Default: Only see their own requests
    return {
      type: 'SELF_ONLY',
    };
  }

  /**
   * Lấy danh sách leadership roles
   */
  private getLeadershipRoles(): string[] {
    return [
      ROLE_NAMES.DIVISION_HEAD,
      ROLE_NAMES.PROJECT_MANAGER,
      ROLE_NAMES.TEAM_LEADER,
      ROLE_NAMES.HR_MANAGER,
    ];
  }

  private async buildRoleBasedWhereConditions(
    accessScope: any,
    filters: RequestPaginationDto,
  ): Promise<any> {
    const whereConditions: any = {};

    if (
      accessScope.type === 'DIVISION_ONLY' &&
      accessScope.division_ids?.length > 0
    ) {
      const assignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.DIVISION,
          scope_id: { in: accessScope.division_ids },
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      const user_ids = assignments.map((a) => a.user_id);
      whereConditions.user_id = { in: user_ids };
    } else if (
      accessScope.type === 'TEAM_ONLY' &&
      accessScope.team_ids?.length > 0
    ) {
      const assignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.TEAM,
          scope_id: { in: accessScope.team_ids },
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      const user_ids = assignments.map((a) => a.user_id);
      whereConditions.user_id = { in: user_ids };
    } else if (
      accessScope.type === 'PROJECT_ONLY' &&
      accessScope.projectIds?.length > 0
    ) {
      const assignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.PROJECT,
          scope_id: { in: accessScope.projectIds },
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      const user_ids = assignments.map((a) => a.user_id);
      whereConditions.user_id = { in: user_ids };
    } else if (accessScope.type === 'SELF_ONLY') {
      return whereConditions;
    }

    if (accessScope.type === 'ALL_ACCESS') {
      if (filters.division_id) {
        const assignments = await this.prisma.user_role_assignment.findMany({
          where: {
            scope_type: ScopeType.DIVISION,
            scope_id: filters.division_id,
            deleted_at: null,
          },
          select: { user_id: true },
          distinct: ['user_id'],
        });
        const user_ids = assignments.map((a) => a.user_id);
        whereConditions.user_id = { in: user_ids };
      }

      if (filters.team_id) {
        whereConditions.user = {
          ...whereConditions.user,
          user_division: {
            some: {
              team_id: filters.team_id,
            },
          },
        };
      }
    }

    return whereConditions;
  }
  private isHighPriorityRequest(request: any): boolean {
    if (
      this.getLeadershipRoles().includes(
        request.user?.role_assignments.map((role) => role.name?.toLowerCase()),
      )
    ) {
      return true;
    }

    if (request.type === 'day_off' && request.duration_days >= 3) {
      return true;
    }

    if (request.type === 'overtime' && request.duration_hours >= 4) {
      return true;
    }

    if (request.status === 'PENDING') {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      if (new Date(request.created_at) <= threeDaysAgo) {
        return true;
      }
    }

    return false;
  }

  /**
   * Lấy danh sách user IDs trong teams
   */
  private async getTeamuser_ids(team_ids: number[]): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: { in: team_ids },
        deleted_at: null,
      },
      select: {
        user_id: true,
      },
      distinct: ['user_id'],
    });

    return assignments.map((a) => a.user_id);
  }

  private async getProjectUserIds(projectIds: number[]): Promise<number[]> {
    if (projectIds.length === 0) return [];

    const user_ids: Set<number> = new Set();

    const pmAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: { in: projectIds },
        deleted_at: null,
      },
      select: { user_id: true },
    });

    pmAssignments.forEach((a) => user_ids.add(a.user_id));

    const projects = await this.prisma.projects.findMany({
      where: {
        id: { in: projectIds },
        deleted_at: null,
      },
      select: { team_id: true },
    });

    const team_ids = projects
      .map((p) => p.team_id)
      .filter((id): id is number => id !== null);

    if (team_ids.length > 0) {
      const teamMemberAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.TEAM,
          scope_id: { in: team_ids },
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });

      teamMemberAssignments.forEach((a) => user_ids.add(a.user_id));
    }

    return Array.from(user_ids);
  }

  async updateRemoteWorkRequest(
    id: number,
    dto: CreateRemoteWorkRequestDto,
    user_id: number,
  ) {
    const existing = await this.prisma.remote_work_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.REMOTE_WORK_REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.REJECTED) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_UPDATE_REJECTED);
    }

    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);
    this.validateFutureDate(workDate, false);

    if (dto.remote_type === RemoteType.OFFICE) {
      throw new BadRequestException(REQUEST_ERRORS.INVALID_REQUEST_TYPE);
    }

    const conflictingRequest = await this.prisma.remote_work_requests.findFirst({
      where: {
        id: { not: id },
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
      },
    });

    if (conflictingRequest) {
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);
    }

    const dayOff = await this.prisma.day_offs.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        status: 'APPROVED',
        deleted_at: null,
      },
    });

    if (dayOff) {
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);
    }

    const updated = await this.prisma.remote_work_requests.update({
      where: { id },
      data: {
        work_date: workDate,
        remote_type: dto.remote_type,
        duration: dto.duration,
        title: dto.title,
        reason: dto.reason,
        status: ApprovalStatus.PENDING,
        approved_by: null,
        approved_at: null,
        rejected_reason: null,
      },
    });

    await this.activityLogService.logRequestUpdated(
      'remote_work',
      id,
      user_id,
      {
        work_date: workDate.toISOString(),
        remote_type: dto.remote_type,
        duration: dto.duration,
      },
    );

    return updated;
  }

  async deleteRemoteWorkRequest(id: number, user_id: number) {
    const existing = await this.prisma.remote_work_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.REMOTE_WORK_REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_DELETE_PENDING);
    }

    const deleted = await this.prisma.remote_work_requests.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.activityLogService.logRequestDeleted(
      'remote_work',
      id,
      user_id,
    );

    return deleted;
  }

  async updateDayOffRequest(
    id: number,
    dto: CreateDayOffRequestDto,
    user_id: number,
  ) {
    const existing = await this.prisma.day_offs.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.DAY_OFF_REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.REJECTED) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_UPDATE_REJECTED);
    }

    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);

    const conflictingDayOff = await this.prisma.day_offs.findFirst({
      where: {
        id: { not: id },
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
      },
    });

    if (conflictingDayOff) {
      throw new BadRequestException(REQUEST_ERRORS.DAY_OFF_ALREADY_EXISTS);
    }

    const dayOffAmount = dto.duration === 'FULL_DAY' ? 1 : 0.5;

    if (dto.type === DayOffType.PAID) {
      const leaveBalance =
        await this.leaveBalanceService.getOrCreateLeaveBalance(dto.user_id);

      if (leaveBalance.paid_leave_balance < dayOffAmount) {
        throw new BadRequestException(
          `Không đủ số dư phép có lương. Hiện có: ${leaveBalance.paid_leave_balance} ngày, cần: ${dayOffAmount} ngày`,
        );
      }
    }

    const updated = await this.prisma.day_offs.update({
      where: { id },
      data: {
        work_date: workDate,
        duration: dto.duration,
        type: dto.type,
        title: dto.title,
        reason: dto.reason,
        is_past: dto.is_past ?? false,
        status: ApprovalStatus.PENDING,
        approved_by: null,
        approved_at: null,
        rejected_reason: null,
      },
    });

    await this.activityLogService.logRequestUpdated(
      'day_off',
      id,
      user_id,
      {
        work_date: workDate.toISOString(),
        type: dto.type,
        duration: dto.duration,
      },
    );

    return updated;
  }

  async deleteDayOffRequest(id: number, user_id: number) {
    const existing = await this.prisma.day_offs.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.DAY_OFF_REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_DELETE_PENDING);
    }

    const deleted = await this.prisma.day_offs.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.activityLogService.logRequestDeleted(
      'day_off',
      id,
      user_id,
    );

    return deleted;
  }

  async updateOvertimeRequest(
    id: number,
    dto: CreateOvertimeRequestDto,
    user_id: number,
  ) {
    const existing = await this.prisma.over_times_history.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.OVERTIME_REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.REJECTED) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_UPDATE_REJECTED);
    }

    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);

    const project = await this.prisma.projects.findFirst({
      where: { id: dto.project_id, deleted_at: null },
    });

    if (!project) {
      throw new BadRequestException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    const conflictingOvertime = await this.prisma.over_times_history.findFirst({
      where: {
        id: { not: id },
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
      },
    });

    if (conflictingOvertime) {
      throw new BadRequestException(REQUEST_ERRORS.OVERTIME_ALREADY_EXISTS);
    }

    const [startHour, startMinute] = dto.start_time.split(':').map(Number);
    const [endHour, endMinute] = dto.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const totalHours = (endMinutes - startMinutes) / 60;

    const normalWorkStart = 8 * 60;
    const normalWorkEnd = 17 * 60;

    if (startMinutes < normalWorkEnd && endMinutes > normalWorkStart) {
      throw new BadRequestException(REQUEST_ERRORS.OVERTIME_OVERLAP_WORK_HOURS);
    }

    const hourlyRate = null;
    const totalAmount = null;

    const updated = await this.prisma.over_times_history.update({
      where: { id },
      data: {
        title: dto.title,
        project_id: dto.project_id,
        work_date: workDate,
        start_time: new Date(
          `${workDate.toISOString().split('T')[0]} ${dto.start_time}`,
        ),
        end_time: new Date(
          `${workDate.toISOString().split('T')[0]} ${dto.end_time}`,
        ),
        total_hours: totalHours,
        hourly_rate: hourlyRate,
        total_amount: totalAmount,
        reason: dto.reason,
        status: ApprovalStatus.PENDING,
        approved_by: null,
        approved_at: null,
        rejected_reason: null,
      },
    });

    await this.activityLogService.logRequestUpdated(
      'overtime',
      id,
      user_id,
      {
        work_date: workDate.toISOString(),
        start_time: dto.start_time,
        end_time: dto.end_time,
        total_hours: totalHours,
      },
    );

    return updated;
  }

  async deleteOvertimeRequest(id: number, user_id: number) {
    const existing = await this.prisma.over_times_history.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.OVERTIME_REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_DELETE_PENDING);
    }

    const deleted = await this.prisma.over_times_history.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.activityLogService.logRequestDeleted(
      'overtime',
      id,
      user_id,
    );

    return deleted;
  }

  async updateLateEarlyRequest(
    id: number,
    dto: CreateLateEarlyRequestDto,
    user_id: number,
  ) {
    const existing = await this.prisma.late_early_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.REJECTED) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_UPDATE_REJECTED);
    }

    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);

    const conflictingRequest = await this.prisma.late_early_requests.findFirst({
      where: {
        id: { not: id },
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
      },
    });

    if (conflictingRequest) {
      throw new BadRequestException('Đã có request đi muộn/về sớm cho ngày này');
    }

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

    const updated = await this.prisma.late_early_requests.update({
      where: { id },
      data: {
        work_date: workDate,
        request_type: dto.request_type,
        title: dto.title,
        late_minutes: dto.late_minutes || undefined,
        early_minutes: dto.early_minutes || undefined,
        reason: dto.reason,
        status: ApprovalStatus.PENDING,
        approved_by: null,
        approved_at: null,
        rejected_reason: null,
      },
    });

    await this.activityLogService.logRequestUpdated(
      'late_early',
      id,
      user_id,
      {
        work_date: workDate.toISOString(),
        request_type: dto.request_type,
        late_minutes: dto.late_minutes,
        early_minutes: dto.early_minutes,
      },
    );

    return updated;
  }

  async deleteLateEarlyRequest(id: number, user_id: number) {
    const existing = await this.prisma.late_early_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_DELETE_PENDING);
    }

    const deleted = await this.prisma.late_early_requests.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.activityLogService.logRequestDeleted(
      'late_early',
      id,
      user_id,
    );

    return deleted;
  }

  async updateForgotCheckinRequest(
    id: number,
    dto: CreateForgotCheckinRequestDto,
    user_id: number,
  ) {
    const existing = await this.prisma.forgot_checkin_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.REJECTED) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_UPDATE_REJECTED);
    }

    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);
    this.validatePastOrCurrentDate(workDate);

    const conflictingRequest = await this.prisma.forgot_checkin_requests.findFirst({
      where: {
        id: { not: id },
        user_id: dto.user_id,
        work_date: workDate,
        deleted_at: null,
      },
    });

    if (conflictingRequest) {
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);
    }

    if (dto.checkin_time && dto.checkout_time) {
      const checkin_time = new Date(
        `${workDate.toISOString().split('T')[0]} ${dto.checkin_time}`,
      );
      const checkout_time = new Date(
        `${workDate.toISOString().split('T')[0]} ${dto.checkout_time}`,
      );

      if (checkout_time <= checkin_time) {
        throw new BadRequestException(REQUEST_ERRORS.INVALID_TIME_RANGE);
      }
    }

    const checkinDateTime = dto.checkin_time
      ? new Date(`${workDate.toISOString().split('T')[0]} ${dto.checkin_time}`)
      : null;
    const checkoutDateTime = dto.checkout_time
      ? new Date(`${workDate.toISOString().split('T')[0]} ${dto.checkout_time}`)
      : null;

    const updated = await this.prisma.forgot_checkin_requests.update({
      where: { id },
      data: {
        work_date: workDate,
        checkin_time: checkinDateTime,
        checkout_time: checkoutDateTime,
        title: dto.title,
        reason: dto.reason,
        status: ApprovalStatus.PENDING,
        approved_by: null,
        approved_at: null,
        rejected_reason: null,
      },
    });

    await this.activityLogService.logRequestUpdated(
      'forgot_checkin',
      id,
      user_id,
      {
        work_date: workDate.toISOString(),
        checkin_time: dto.checkin_time,
        checkout_time: dto.checkout_time,
      },
    );

    return updated;
  }

  async deleteForgotCheckinRequest(id: number, user_id: number) {
    const existing = await this.prisma.forgot_checkin_requests.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_DELETE_PENDING);
    }

    const deleted = await this.prisma.forgot_checkin_requests.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.activityLogService.logRequestDeleted(
      'forgot_checkin',
      id,
      user_id,
    );

    return deleted;
  }
}
