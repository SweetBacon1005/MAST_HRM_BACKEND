import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  DayOffType,
  RemoteType,
  ScopeType,
} from '@prisma/client';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { AuthorizationContext } from '../auth/services/authorization-context.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import {
  REQUEST_ERRORS,
  SUCCESS_MESSAGES,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { LeaveBalanceService } from '../leave-management/services/leave-balance.service';
import { CreateDayOffRequestDto } from '../timesheet/dto/create-day-off-request.dto';
import { CreateOvertimeRequestDto } from '../timesheet/dto/create-overtime-request.dto';
import { TimesheetService } from '../timesheet/timesheet.service';
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
import { AttendanceRequestService } from './services/attendance-request.service';
import { DayOffDetailService } from './services/day-off-detail.service';
import { ForgotCheckinDetailService } from './services/forgot-checkin-detail.service';
import { LateEarlyDetailService } from './services/late-early-detail.service';
import { OvertimeDetailService } from './services/overtime-detail.service';
import { RemoteWorkDetailService } from './services/remote-work-detail.service';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly timesheetService: TimesheetService,
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly attendanceRequestService: AttendanceRequestService,
    private readonly dayOffDetailService: DayOffDetailService,
    private readonly remoteWorkDetailService: RemoteWorkDetailService,
    private readonly lateEarlyDetailService: LateEarlyDetailService,
    private readonly forgotCheckinDetailService: ForgotCheckinDetailService,
    private readonly overtimeDetailService: OvertimeDetailService,
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

    const isDuplicate =
      await this.attendanceRequestService.checkDuplicateRequest(
        dto.user_id,
        workDate,
        'REMOTE_WORK',
      );
    if (isDuplicate) {
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);
    }

    const conflictingDayOff = await this.attendanceRequestService.findMany({
      user_id: dto.user_id,
      work_date: workDate,
      request_type: 'DAY_OFF',
      status: ApprovalStatus.APPROVED,
      deleted_at: null,
    });
    if (conflictingDayOff.length > 0) {
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

    const attendanceRequest =
      await this.attendanceRequestService.createAttendanceRequest({
        user_id: dto.user_id,
        timesheet_id: timesheet.id,
        work_date: workDate,
        request_type: 'REMOTE_WORK',
        title: dto.title,
        reason: dto.reason,
      });

    await this.remoteWorkDetailService.createRemoteWorkDetail({
      request_id: attendanceRequest.id,
      remote_type: dto.remote_type,
      duration: dto.duration,
    });

    const fullRequest = await this.attendanceRequestService.findOne(
      attendanceRequest.id,
    );
    return this.mapToRemoteWorkRequestResponse(fullRequest);
  }

  async findAllRemoteWorkRequests(
    paginationDto: RemoteWorkRequestPaginationDto = {},
    user_id: number,
  ) {
    const accessScope = await this.determineAccessScope(user_id);

    let user_idsFilter: number[] | undefined;

    if (accessScope.type === 'DIVISION_ONLY') {
      if (accessScope.division_ids && accessScope.division_ids.length > 0) {
        user_idsFilter = await this.getDivisionuser_ids(
          accessScope.division_ids,
        );
      } else {
        user_idsFilter = [];
      }
    } else if (accessScope.type === 'ADMIN_ACCESS') {
      const divisionHeaduser_ids = await this.getUserIdsByRole(
        ROLE_NAMES.DIVISION_HEAD,
      );
      user_idsFilter = [user_id, ...divisionHeaduser_ids];
    }

    if (user_idsFilter !== undefined && user_idsFilter.length === 0) {
      return buildPaginationResponse(
        [],
        0,
        paginationDto.page || 1,
        paginationDto.limit || 10,
      );
    }

    const requests = await this.attendanceRequestService.findMany({
      user_id: user_idsFilter ? { in: user_idsFilter } : undefined,
      request_type: 'REMOTE_WORK',
      status: paginationDto.status as ApprovalStatus,
      work_date:
        paginationDto.start_date && paginationDto.end_date
          ? {
              gte: new Date(paginationDto.start_date),
              lte: new Date(paginationDto.end_date),
            }
          : undefined,
      deleted_at: null,
    });

    // Filter by remote_type if needed
    const filteredRequests = paginationDto.remote_type
      ? requests.filter(
          (r) =>
            r.remote_work_request?.remote_type === paginationDto.remote_type,
        )
      : requests;

    // Apply pagination
    const start = ((paginationDto.page || 1) - 1) * (paginationDto.limit || 10);
    const end = start + (paginationDto.limit || 10);
    const data = filteredRequests
      .slice(start, end)
      .map((r) => this.mapToRemoteWorkRequestResponse(r));

    return buildPaginationResponse(
      data,
      filteredRequests.length,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findMyRemoteWorkRequests(
    user_id: number,
    paginationDto: RemoteWorkRequestPaginationDto = {},
  ) {
    const requests = await this.attendanceRequestService.findMany({
      user_id: user_id,
      request_type: 'REMOTE_WORK',
      status: paginationDto.status as ApprovalStatus,
      work_date:
        paginationDto.start_date && paginationDto.end_date
          ? {
              gte: new Date(paginationDto.start_date),
              lte: new Date(paginationDto.end_date),
            }
          : undefined,
      deleted_at: null,
    });

    // Filter by remote_type if needed
    const filteredRequests = paginationDto.remote_type
      ? requests.filter(
          (r) =>
            r.remote_work_request?.remote_type === paginationDto.remote_type,
        )
      : requests;

    // Apply pagination
    const start = ((paginationDto.page || 1) - 1) * (paginationDto.limit || 10);
    const end = start + (paginationDto.limit || 10);
    const data = filteredRequests
      .slice(start, end)
      .map((r) => this.mapToRemoteWorkRequestResponse(r));

    return buildPaginationResponse(
      data,
      filteredRequests.length,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async createDayOffRequest(
    dto: CreateDayOffRequestDto,
  ): Promise<DayOffRequestResponseDto> {
    await this.validateUser(dto.user_id);
    const workDate = new Date(dto.work_date);

    const isDuplicate =
      await this.attendanceRequestService.checkDuplicateRequest(
        dto.user_id,
        workDate,
        'DAY_OFF',
      );
    if (isDuplicate)
      throw new BadRequestException(REQUEST_ERRORS.DAY_OFF_ALREADY_EXISTS);

    const dayOffAmount = dto.duration === 'FULL_DAY' ? 1 : 0.5;
    if (dto.type === DayOffType.PAID) {
      const leaveBalance =
        await this.leaveBalanceService.getOrCreateLeaveBalance(dto.user_id);
      if (leaveBalance.paid_leave_balance < dayOffAmount) {
        throw new BadRequestException(
          `Không đủ số dư phép. Hiện có: ${leaveBalance.paid_leave_balance}, cần: ${dayOffAmount}`,
        );
      }
    }

    let timesheet = await this.prisma.time_sheets.findFirst({
      where: { user_id: dto.user_id, work_date: workDate },
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

    const attendanceRequest =
      await this.attendanceRequestService.createAttendanceRequest({
        user_id: dto.user_id,
        timesheet_id: timesheet.id,
        work_date: workDate,
        request_type: 'DAY_OFF',
        title: dto.title,
        reason: dto.reason,
      });

    await this.dayOffDetailService.createDayOffDetail({
      request_id: attendanceRequest.id,
      duration: dto.duration,
      type: dto.type,
      is_past: dto.is_past || false,
    });

    const fullRequest = await this.attendanceRequestService.findOne(
      attendanceRequest.id,
    );
    return this.mapToDayOffRequestResponse(fullRequest);
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

    const requests = await this.attendanceRequestService.findMany({
      user_id: user_idsFilter ? { in: user_idsFilter } : undefined,
      request_type: 'DAY_OFF',
      status: paginationDto.status as ApprovalStatus,
      work_date:
        paginationDto.start_date && paginationDto.end_date
          ? {
              gte: new Date(paginationDto.start_date),
              lte: new Date(paginationDto.end_date),
            }
          : undefined,
      deleted_at: null,
    });

    // Apply pagination
    const start = ((paginationDto.page || 1) - 1) * (paginationDto.limit || 10);
    const end = start + (paginationDto.limit || 10);
    const data = requests
      .slice(start, end)
      .map((r) => this.mapToDayOffRequestResponse(r));

    return buildPaginationResponse(
      data,
      requests.length,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findMyDayOffRequests(
    user_id: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const requests = await this.attendanceRequestService.findMany({
      user_id: user_id,
      request_type: 'DAY_OFF',
      status: paginationDto.status as ApprovalStatus,
      work_date:
        paginationDto.start_date && paginationDto.end_date
          ? {
              gte: new Date(paginationDto.start_date),
              lte: new Date(paginationDto.end_date),
            }
          : undefined,
      deleted_at: null,
    });

    // Apply pagination
    const start = ((paginationDto.page || 1) - 1) * (paginationDto.limit || 10);
    const end = start + (paginationDto.limit || 10);
    const data = requests
      .slice(start, end)
      .map((r) => this.mapToDayOffRequestResponse(r));

    return buildPaginationResponse(
      data,
      requests.length,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async createOvertimeRequest(
    dto: CreateOvertimeRequestDto,
  ): Promise<OvertimeRequestResponseDto> {
    // 1. Validate
    await this.validateUser(dto.user_id);
    const workDate = new Date(dto.work_date);

    // 2. Check duplicate
    const isDuplicate =
      await this.attendanceRequestService.checkDuplicateRequest(
        dto.user_id,
        workDate,
        'OVERTIME',
      );
    if (isDuplicate) {
      throw new BadRequestException(REQUEST_ERRORS.OVERTIME_ALREADY_EXISTS);
    }

    // 3. Calculate total hours and validate
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

    // 4. Get or create timesheet
    let timesheet = await this.prisma.time_sheets.findFirst({
      where: { user_id: dto.user_id, work_date: workDate },
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

    // 5. Create attendance_request
    const attendanceRequest =
      await this.attendanceRequestService.createAttendanceRequest({
        user_id: dto.user_id,
        timesheet_id: timesheet.id,
        work_date: workDate,
        request_type: 'OVERTIME',
        title: dto.title,
        reason: dto.reason,
      });

    // 6. Create overtime detail
    const startTime = new Date(`1970-01-01T${dto.start_time}:00Z`);
    const endTime = new Date(`1970-01-01T${dto.end_time}:00Z`);

    await this.overtimeDetailService.createOvertimeDetail({
      request_id: attendanceRequest.id,
      start_time: startTime,
      end_time: endTime,
      total_hours: totalHours,
    });

    const fullRequest = await this.attendanceRequestService.findOne(
      attendanceRequest.id,
    );
    return this.mapToOvertimeRequestResponse(fullRequest);
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

    const requests = await this.attendanceRequestService.findMany({
      user_id: user_idsFilter ? { in: user_idsFilter } : undefined,
      request_type: 'OVERTIME',
      status: paginationDto.status as ApprovalStatus,
      work_date:
        paginationDto.start_date && paginationDto.end_date
          ? {
              gte: new Date(paginationDto.start_date),
              lte: new Date(paginationDto.end_date),
            }
          : undefined,
      deleted_at: null,
    });

    // Apply pagination
    const start = ((paginationDto.page || 1) - 1) * (paginationDto.limit || 10);
    const end = start + (paginationDto.limit || 10);
    const data = requests
      .slice(start, end)
      .map((r) => this.mapToOvertimeRequestResponse(r));

    return buildPaginationResponse(
      data,
      requests.length,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findMyOvertimeRequests(
    user_id: number,
    paginationDto: RequestPaginationDto = {},
  ) {
    const requests = await this.attendanceRequestService.findMany({
      user_id: user_id,
      request_type: 'OVERTIME',
      status: paginationDto.status as ApprovalStatus,
      work_date:
        paginationDto.start_date && paginationDto.end_date
          ? {
              gte: new Date(paginationDto.start_date),
              lte: new Date(paginationDto.end_date),
            }
          : undefined,
      deleted_at: null,
    });

    // Apply pagination
    const start = ((paginationDto.page || 1) - 1) * (paginationDto.limit || 10);
    const end = start + (paginationDto.limit || 10);
    const data = requests
      .slice(start, end)
      .map((r) => this.mapToOvertimeRequestResponse(r));

    return buildPaginationResponse(
      data,
      requests.length,
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

    const workDateFilter =
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
      this.attendanceRequestService.findMany({
        user_id: { in: user_ids },
        request_type: 'REMOTE_WORK',
        status: whereConditions.status,
        work_date: workDateFilter,
        deleted_at: null,
      }),
      this.attendanceRequestService.findMany({
        user_id: { in: user_ids },
        request_type: 'DAY_OFF',
        status: whereConditions.status,
        work_date: workDateFilter,
        deleted_at: null,
      }),
      this.attendanceRequestService.findMany({
        user_id: { in: user_ids },
        request_type: 'OVERTIME',
        status: whereConditions.status,
        work_date: workDateFilter,
        deleted_at: null,
      }),
      this.attendanceRequestService.findMany({
        user_id: { in: user_ids },
        request_type: 'LATE_EARLY',
        status: whereConditions.status,
        work_date: workDateFilter,
        deleted_at: null,
      }),
      this.attendanceRequestService.findMany({
        user_id: { in: user_ids },
        request_type: 'FORGOT_CHECKIN',
        status: whereConditions.status,
        work_date: workDateFilter,
        deleted_at: null,
      }),
    ]);

    const allRequests = [
      ...remoteWorkData.map((req) => ({
        ...this.mapToRemoteWorkRequestResponse(req),
        type: 'remote_work' as const,
      })),
      ...dayOffData.map((req) => ({
        ...this.mapToDayOffRequestResponse(req),
        type: 'day_off' as const,
      })),
      ...overtimeData.map((req) => ({
        ...this.mapToOvertimeRequestResponse(req),
        type: 'overtime' as const,
      })),
      ...lateEarlyData.map((req) => ({
        ...this.mapToLateEarlyRequestResponse(req),
        type: 'late_early' as const,
      })),
      ...forgotCheckinData.map((req) => ({
        ...this.mapToForgotCheckinRequestResponse(req),
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
    // Map request type strings to AttendanceRequestType
    let requestTypeEnum: string;
    switch (requestType) {
      case 'remote_work':
      case 'remote-work':
        requestTypeEnum = 'REMOTE_WORK';
        break;
      case 'day_off':
      case 'day-off':
        requestTypeEnum = 'DAY_OFF';
        break;
      case 'overtime':
        requestTypeEnum = 'OVERTIME';
        break;
      case 'late_early':
      case 'late-early':
        requestTypeEnum = 'LATE_EARLY';
        break;
      case 'forgot_checkin':
      case 'forgot-checkin':
        requestTypeEnum = 'FORGOT_CHECKIN';
        break;
      default:
        throw new BadRequestException(REQUEST_ERRORS.INVALID_REQUEST_TYPE);
    }

    // Query attendance_requests
    const request = await this.attendanceRequestService.findOne(requestId);

    if (!request) {
      throw new NotFoundException(REQUEST_ERRORS.REQUEST_NOT_FOUND);
    }

    const canView = await authContext.canApproveRequest(
      request.user_id,
      requestType,
    );
    const isOwnRequest = authContext.userId === request.user_id;

    if (!canView && !isOwnRequest) {
      throw new ForbiddenException(
        'Bạn không có quyền xem request này. ' +
          'Chỉ có thể xem requests trong scope quản lý hoặc của chính mình.',
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
      const divisionHeaduser_ids = await this.getUserIdsByRole(
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
        const projectuser_ids = await this.getProjectUserIds(
          accessScope.projectIds,
        );
        user_ids = projectuser_ids;
      } else {
        user_ids = [requesterId!];
      }
    } else {
      user_ids = [requesterId!];
    }

    if (paginationDto.requester_role) {
      const roleuser_ids = await this.getUserIdsByRole(
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
      this.attendanceRequestService.findMany({
        ...whereConditions,
        request_type: 'REMOTE_WORK',
        work_date: dateFilter,
      }),
      this.attendanceRequestService.findMany({
        ...whereConditions,
        request_type: 'DAY_OFF',
        work_date: dateFilter,
      }),
      this.attendanceRequestService.findMany({
        ...whereConditions,
        request_type: 'OVERTIME',
        work_date: dateFilter,
      }),
      this.attendanceRequestService.findMany({
        ...whereConditions,
        request_type: 'LATE_EARLY',
        work_date: dateFilter,
      }),
      this.attendanceRequestService.findMany({
        ...whereConditions,
        request_type: 'FORGOT_CHECKIN',
        work_date: dateFilter,
      }),
    ]);

    const allRequests = [
      ...remoteWorkData.map((req) => ({
        ...this.mapToRemoteWorkRequestResponse(req),
        request_type: 'REMOTE_WORK' as const,
      })),
      ...dayOffData.map((req) => ({
        ...this.mapToDayOffRequestResponse(req),
        request_type: 'DAY_OFF' as const,
      })),
      ...overtimeData.map((req) => ({
        ...this.mapToOvertimeRequestResponse(req),
        request_type: 'OVERTIME' as const,
      })),
      ...lateEarlyData.map((req) => ({
        ...this.mapToLateEarlyRequestResponse(req),
        request_type: 'LATE_EARLY' as const,
      })),
      ...forgotCheckinData.map((req) => ({
        ...this.mapToForgotCheckinRequestResponse(req),
        request_type: 'FORGOT_CHECKIN' as const,
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
    // Fetch all requests for this user
    const allRequests = await this.attendanceRequestService.findMany({
      user_id: user_id,
      deleted_at: null,
    });

    // Group by request_type and status
    const getStatusCounts = (requests: any[]) => {
      const result = { total: 0, pending: 0, approved: 0, rejected: 0 };
      requests.forEach((req) => {
        result.total += 1;
        if (req.status === 'PENDING') result.pending += 1;
        if (req.status === 'APPROVED') result.approved += 1;
        if (req.status === 'REJECTED') result.rejected += 1;
      });
      return result;
    };

    const remoteWorkStats = getStatusCounts(
      allRequests.filter((r) => r.request_type === 'REMOTE_WORK'),
    );
    const dayOffStats = getStatusCounts(
      allRequests.filter((r) => r.request_type === 'DAY_OFF'),
    );
    const overtimeStats = getStatusCounts(
      allRequests.filter((r) => r.request_type === 'OVERTIME'),
    );
    const lateEarlyStats = getStatusCounts(
      allRequests.filter((r) => r.request_type === 'LATE_EARLY'),
    );
    const forgotCheckinStats = getStatusCounts(
      allRequests.filter((r) => r.request_type === 'FORGOT_CHECKIN'),
    );

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
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'REMOTE_WORK') {
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
        REQUEST_ERRORS.CANNOT_APPROVE_REQUEST_PERMISSION,
      );
    }

    await this.attendanceRequestService.approve(id, authContext.userId);

    const updatedRequest = await this.attendanceRequestService.findOne(id);
    await this.updateTimesheetRemoteType(updatedRequest);

    return {
      success: true,
      message: SUCCESS_MESSAGES.REMOTE_WORK_APPROVED,
      data: this.mapToRemoteWorkRequestResponse(updatedRequest),
    };
  }

  private async rejectRemoteWorkRequest(
    id: number,
    authContext: AuthorizationContext,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'REMOTE_WORK') {
      throw new NotFoundException(REQUEST_ERRORS.REMOTE_WORK_REQUEST_NOT_FOUND);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_REJECT_NON_PENDING);
    }

    const canReject = await authContext.canApproveRequest(
      request.user_id,
      'remote-work',
    );

    if (!canReject) {
      throw new ForbiddenException(
        REQUEST_ERRORS.CANNOT_REJECT_REQUEST_PERMISSION,
      );
    }

    await this.attendanceRequestService.reject(id, authContext.userId, reason);

    const updatedRequest = await this.attendanceRequestService.findOne(id);

    return {
      success: true,
      message: SUCCESS_MESSAGES.REMOTE_WORK_REJECTED,
      data: this.mapToRemoteWorkRequestResponse(updatedRequest),
    };
  }

  private async approveDayOffRequest(
    id: number,
    authContext: AuthorizationContext,
  ): Promise<ApprovalResult> {
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'DAY_OFF') {
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
        REQUEST_ERRORS.CANNOT_APPROVE_REQUEST_PERMISSION,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      await this.attendanceRequestService.approve(id, authContext.userId);

      if (request.day_off?.type === DayOffType.PAID) {
        const dayOffAmount = request.day_off.duration === 'FULL_DAY' ? 1 : 0.5;
        await this.leaveBalanceService.deductLeaveBalance(
          request.user_id,
          dayOffAmount,
          DayOffType.PAID,
          id,
          `Sử dụng phép: ${request.reason || 'Nghỉ phép'}`,
        );
      }

      const updatedRequest = await this.attendanceRequestService.findOne(id);
      await this.createTimesheetsForDayOff(updatedRequest);

      return {
        success: true,
        message: SUCCESS_MESSAGES.DAY_OFF_APPROVED,
        data: this.mapToDayOffRequestResponse(updatedRequest),
      };
    });
  }

  private async rejectDayOffRequest(
    id: number,
    authContext: AuthorizationContext,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'DAY_OFF') {
      throw new NotFoundException(REQUEST_ERRORS.DAY_OFF_REQUEST_NOT_FOUND);
    }

    if (
      request.status !== ApprovalStatus.PENDING &&
      request.status !== ApprovalStatus.APPROVED
    ) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_REJECT_NON_PENDING);
    }

    const canReject = await authContext.canApproveRequest(
      request.user_id,
      'day-off',
    );

    if (!canReject) {
      throw new ForbiddenException(
        REQUEST_ERRORS.CANNOT_REJECT_REQUEST_PERMISSION,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      await this.attendanceRequestService.reject(
        id,
        authContext.userId,
        reason,
      );

      if (
        request.status === ApprovalStatus.APPROVED &&
        request.day_off?.type === DayOffType.PAID
      ) {
        const dayOffAmount = request.day_off.duration === 'FULL_DAY' ? 1 : 0.5;
        await this.leaveBalanceService.refundLeaveBalance(
          request.user_id,
          dayOffAmount,
          DayOffType.PAID,
          id,
          `Hoàn trả phép do từ chối đơn: ${reason}`,
        );
      }

      const updatedRequest = await this.attendanceRequestService.findOne(id);

      return {
        success: true,
        message: SUCCESS_MESSAGES.DAY_OFF_REJECTED,
        data: this.mapToDayOffRequestResponse(updatedRequest),
      };
    });
  }

  private async approveOvertimeRequest(
    id: number,
    authContext: AuthorizationContext,
  ): Promise<ApprovalResult> {
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'OVERTIME') {
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
        REQUEST_ERRORS.CANNOT_APPROVE_REQUEST_PERMISSION,
      );
    }

    await this.attendanceRequestService.approve(id, authContext.userId);

    const updatedRequest = await this.attendanceRequestService.findOne(id);

    return {
      success: true,
      message: SUCCESS_MESSAGES.OVERTIME_APPROVED,
      data: this.mapToOvertimeRequestResponse(updatedRequest),
    };
  }

  private async rejectOvertimeRequest(
    id: number,
    authContext: AuthorizationContext,
    reason: string,
  ): Promise<ApprovalResult> {
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'OVERTIME') {
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
        REQUEST_ERRORS.CANNOT_REJECT_REQUEST_PERMISSION,
      );
    }

    await this.attendanceRequestService.reject(id, authContext.userId, reason);

    const updatedRequest = await this.attendanceRequestService.findOne(id);

    return {
      success: true,
      message: SUCCESS_MESSAGES.OVERTIME_REJECTED,
      data: this.mapToOvertimeRequestResponse(updatedRequest),
    };
  }

  private async updateTimesheetRemoteType(request: any) {
    if (request.timesheet_id) {
      await this.prisma.time_sheets.update({
        where: { id: request.timesheet_id },
        data: {
          remote: request.remote_work_request?.remote_type,
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
            remote: request.remote_work_request?.remote_type,
            status: ApprovalStatus.PENDING,
            type: 'NORMAL',
          },
        });

        await this.prisma.attendance_requests.update({
          where: { id: request.id },
          data: { timesheet_id: timesheet.id },
        });
      } else {
        await this.prisma.time_sheets.update({
          where: { id: timesheet.id },
          data: {
            remote: request.remote_work_request?.remote_type,
          },
        });
      }
    }
  }

  private async createTimesheetsForDayOff(dayOff: any) {
    const workDate = new Date(dayOff.work_date);

    const existingTimesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: dayOff.user_id,
        work_date: workDate,
        deleted_at: null,
      },
    });

    const duration = dayOff.day_off?.duration || dayOff.duration;
    const workHours =
      duration === 'FULL_DAY'
        ? { morningHours: 0, afternoonHours: 0, totalHours: 0 }
        : duration === 'MORNING'
          ? { morningHours: 0, afternoonHours: 4 * 60, totalHours: 4 * 60 }
          : { morningHours: 4 * 60, afternoonHours: 0, totalHours: 4 * 60 };

    if (!existingTimesheet) {
      await this.prisma.time_sheets.create({
        data: {
          user_id: dayOff.user_id,
          work_date: workDate,
          status: 'APPROVED',
          type: 'NORMAL',
          // REMOVED: work_time_morning, work_time_afternoon
          total_work_time: workHours.totalHours,
          is_complete: dayOff.duration === 'FULL_DAY' ? false : true,
        },
      });
    } else {
      await this.prisma.time_sheets.update({
        where: { id: existingTimesheet.id },
        data: {
          // REMOVED: work_time_morning, work_time_afternoon
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

  async getAllRequestQuotasAndBalances(user_id: number) {
    await this.validateUser(user_id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const leaveBalanceData = await this.prisma.user_leave_balances.findUnique({
      where: { user_id },
      select: {
        paid_leave_balance: true,
        unpaid_leave_balance: true,
        annual_paid_leave_quota: true,
        carry_over_days: true,
        monthly_forgot_checkin_quota: true,
        monthly_late_early_quota: true,
        monthly_late_early_count_quota: true,
        monthly_violation_minutes_quota: true,
        last_reset_date: true,
      },
    });

    const allRequests = await this.attendanceRequestService.findMany({
      user_id,
      work_date: { gte: startOfMonth, lte: endOfMonth },
      request_type: { in: ['FORGOT_CHECKIN', 'LATE_EARLY'] },
      deleted_at: null,
    });

    const forgotCheckinRequests = allRequests.filter(
      (r) => r.request_type === 'FORGOT_CHECKIN' && r.status !== 'REJECTED',
    );
    const forgotCheckinCount = forgotCheckinRequests.length;

    const lateEarlyRequests = allRequests.filter(
      (r) => r.request_type === 'LATE_EARLY' && r.status !== 'REJECTED',
    );
    const lateEarlyRequestCount = lateEarlyRequests.length;
    const totalLateEarlyMinutes = lateEarlyRequests.reduce((total, req) => {
      const detail = req.late_early_request;
      return total + (detail?.late_minutes || 0) + (detail?.early_minutes || 0);
    }, 0);

    const approvedLateEarlyRequests = allRequests.filter(
      (r) => r.request_type === 'LATE_EARLY' && r.status === 'APPROVED',
    );
    const usedLateMinutes = approvedLateEarlyRequests.reduce((total, req) => {
      return total + (req.late_early_request?.late_minutes || 0);
    }, 0);
    const usedEarlyMinutes = approvedLateEarlyRequests.reduce((total, req) => {
      return total + (req.late_early_request?.early_minutes || 0);
    }, 0);
    const totalUsedMinutes = usedLateMinutes + usedEarlyMinutes;

    const paidLeaveBalance = leaveBalanceData?.paid_leave_balance || 0;
    const unpaidLeaveBalance = leaveBalanceData?.unpaid_leave_balance || 0;
    const annualQuota = leaveBalanceData?.annual_paid_leave_quota || 0;
    const carryOverDays = leaveBalanceData?.carry_over_days || 0;

    const forgotCheckinQuota =
      leaveBalanceData?.monthly_forgot_checkin_quota || 3;
    const lateEarlyMinutesQuota =
      leaveBalanceData?.monthly_late_early_quota || 120;
    const lateEarlyCountQuota =
      leaveBalanceData?.monthly_late_early_count_quota || 3;

    const violationQuota =
      leaveBalanceData?.monthly_violation_minutes_quota || 60;

    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      leave_balance: {
        paid_leave: {
          quota: annualQuota,
          used: annualQuota - paidLeaveBalance,
          remaining: paidLeaveBalance,
          unit: 'ngày',
        },
        unpaid_leave: {
          quota: null,
          used: null,
          remaining: unpaidLeaveBalance,
          unit: 'ngày',
        },
        carry_over_days: carryOverDays,
      },
      forgot_checkin_quota: {
        quota: forgotCheckinQuota,
        used: forgotCheckinCount,
        remaining: Math.max(0, forgotCheckinQuota - forgotCheckinCount),
        exceeded: forgotCheckinCount >= forgotCheckinQuota,
        unit: 'lần',
      },
      late_early_quota: {
        count: {
          quota: lateEarlyCountQuota,
          used: lateEarlyRequestCount,
          remaining: Math.max(0, lateEarlyCountQuota - lateEarlyRequestCount),
          exceeded: lateEarlyRequestCount >= lateEarlyCountQuota,
          unit: 'lần',
        },
        minutes: {
          quota: lateEarlyMinutesQuota,
          used: totalLateEarlyMinutes,
          remaining: Math.max(0, lateEarlyMinutesQuota - totalLateEarlyMinutes),
          exceeded: totalLateEarlyMinutes >= lateEarlyMinutesQuota,
          unit: 'phút',
        },
        overall_exceeded:
          lateEarlyRequestCount >= lateEarlyCountQuota ||
          totalLateEarlyMinutes >= lateEarlyMinutesQuota,
      },
      late_early_balance: {
        quota: violationQuota,
        used_minutes: totalUsedMinutes,
        used_late_minutes: usedLateMinutes,
        used_early_minutes: usedEarlyMinutes,
        remaining_minutes: Math.max(0, violationQuota - totalUsedMinutes),
        exceeded: totalUsedMinutes > violationQuota,
        exceeded_by: Math.max(0, totalUsedMinutes - violationQuota),
        unit: 'phút',
      },
      last_reset_date: leaveBalanceData?.last_reset_date || null,
    };
  }

  async createLateEarlyRequest(
    dto: CreateLateEarlyRequestDto,
  ): Promise<LateEarlyRequestResponseDto> {
    await this.validateUser(dto.user_id);
    const totalRequestMinutes =
      (dto.late_minutes || 0) + (dto.early_minutes || 0);
    await this.timesheetService.validateRequestQuota(
      dto.user_id,
      'late_early',
      totalRequestMinutes,
    );
    const workDate = new Date(dto.work_date);

    const isDuplicate =
      await this.attendanceRequestService.checkDuplicateRequest(
        dto.user_id,
        workDate,
        'LATE_EARLY',
      );
    if (isDuplicate)
      throw new BadRequestException(
        'Đã có request đi muộn/về sớm cho ngày này',
      );

    if (dto.request_type === 'LATE' && !dto.late_minutes)
      throw new BadRequestException('Số phút đi muộn là bắt buộc');
    if (dto.request_type === 'EARLY' && !dto.early_minutes)
      throw new BadRequestException('Số phút về sớm là bắt buộc');
    if (
      dto.request_type === 'BOTH' &&
      (!dto.late_minutes || !dto.early_minutes)
    ) {
      throw new BadRequestException(
        'Cả số phút đi muộn và về sớm đều là bắt buộc',
      );
    }

    let timesheet = await this.prisma.time_sheets.findFirst({
      where: { user_id: dto.user_id, work_date: workDate },
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

    const attendanceRequest =
      await this.attendanceRequestService.createAttendanceRequest({
        user_id: dto.user_id,
        timesheet_id: timesheet.id,
        work_date: workDate,
        request_type: 'LATE_EARLY',
        title: dto.title,
        reason: dto.reason,
      });

    await this.lateEarlyDetailService.createLateEarlyDetail({
      request_id: attendanceRequest.id,
      request_type: dto.request_type,
      late_minutes: dto.late_minutes,
      early_minutes: dto.early_minutes,
    });

    const fullRequest = await this.attendanceRequestService.findOne(
      attendanceRequest.id,
    );
    return this.mapToLateEarlyRequestResponse(fullRequest);
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

    const where: any = {
      deleted_at: null,
      request_type: 'LATE_EARLY',
    };

    if (user_idsFilter !== undefined) {
      where.user_id = { in: user_idsFilter };
    }

    if (paginationDto.status) {
      where.status = paginationDto.status as ApprovalStatus;
    }

    if (paginationDto.start_date && paginationDto.end_date) {
      where.work_date = {
        gte: new Date(paginationDto.start_date),
        lte: new Date(paginationDto.end_date),
      };
    }

    const [requests, total] = await Promise.all([
      this.prisma.attendance_requests.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  code: true,
                  avatar: true,
                },
              },
            },
          },
          late_early_request: true,
        },
        orderBy: orderBy || { created_at: 'desc' },
        skip,
        take,
      }),
      this.attendanceRequestService.count(where),
    ]);

    return buildPaginationResponse(
      requests.map((r) => this.mapToLateEarlyRequestResponse(r)),
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

    const whereClause: any = {
      user_id: user_id,
      deleted_at: null,
      request_type: 'LATE_EARLY',
    };

    const [requests, total] = await Promise.all([
      this.prisma.attendance_requests.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  code: true,
                  avatar: true,
                },
              },
            },
          },
          late_early_request: true,
        },
        orderBy: orderBy || { created_at: 'desc' },
        skip,
        take,
      }),
      this.attendanceRequestService.count(whereClause),
    ]);

    return buildPaginationResponse(
      requests.map((r) => this.mapToLateEarlyRequestResponse(r)),
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
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'LATE_EARLY') {
      throw new NotFoundException(REQUEST_ERRORS.LATE_EARLY_REQUEST_NOT_FOUND);
    }

    const canApprove = await authContext.canApproveRequest(
      request.user_id,
      'late-early',
    );

    if (!canApprove) {
      throw new ForbiddenException(
        REQUEST_ERRORS.CANNOT_APPROVE_REQUEST_PERMISSION,
      );
    }

    await this.attendanceRequestService.approve(id, authContext.userId);

    const updatedRequest = await this.attendanceRequestService.findOne(id);
    await this.updateTimesheetWithApprovedLateEarly(updatedRequest);

    return {
      success: true,
      message: SUCCESS_MESSAGES.OPERATION_SUCCESSFUL,
      data: this.mapToLateEarlyRequestResponse(updatedRequest),
    };
  }

  async rejectLateEarlyRequest(
    id: number,
    authContext: AuthorizationContext,
    rejectedReason: string,
  ): Promise<ApprovalResult> {
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'LATE_EARLY') {
      throw new NotFoundException(REQUEST_ERRORS.LATE_EARLY_REQUEST_NOT_FOUND);
    }

    const canReject = await authContext.canApproveRequest(
      request.user_id,
      'late-early',
    );

    if (!canReject) {
      throw new ForbiddenException(
        REQUEST_ERRORS.CANNOT_REJECT_REQUEST_PERMISSION,
      );
    }

    await this.attendanceRequestService.reject(
      id,
      authContext.userId,
      rejectedReason,
    );

    const updatedRequest = await this.attendanceRequestService.findOne(id);

    return {
      success: true,
      message: SUCCESS_MESSAGES.OPERATION_SUCCESSFUL,
      data: this.mapToLateEarlyRequestResponse(updatedRequest),
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

    if (timesheet && request.late_early_request) {
      const updateData: any = {};

      if (request.late_early_request.late_minutes) {
        updateData.late_time_approved = request.late_early_request.late_minutes;
      }

      if (request.late_early_request.early_minutes) {
        updateData.early_time_approved =
          request.late_early_request.early_minutes;
      }

      updateData.late_early_approved = true;

      if (Object.keys(updateData).length > 0) {
        await this.prisma.time_sheets.update({
          where: { id: timesheet.id },
          data: updateData,
        });
      }

      if (!request.timesheet_id) {
        await this.prisma.attendance_requests.update({
          where: { id: request.id },
          data: { timesheet_id: timesheet.id },
        });
      }
    }
  }

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
        return await this.rejectOvertimeRequest(
          id,
          authContext,
          rejectedReason,
        );
      case RequestType.REMOTE_WORK:
        return await this.rejectRemoteWorkRequest(
          id,
          authContext,
          rejectedReason,
        );
      case RequestType.LATE_EARLY:
        return await this.rejectLateEarlyRequest(
          id,
          authContext,
          rejectedReason,
        );
      case RequestType.FORGOT_CHECKIN:
        return await this.rejectForgotCheckinRequest(
          id,
          authContext,
          rejectedReason,
        );
      default:
        throw new BadRequestException(REQUEST_ERRORS.INVALID_REQUEST_TYPE);
    }
  }

  async createForgotCheckinRequest(
    dto: CreateForgotCheckinRequestDto,
  ): Promise<ForgotCheckinRequestResponseDto> {
    await this.validateUser(dto.user_id);
    await this.timesheetService.validateRequestQuota(
      dto.user_id,
      'forgot_checkin',
    );
    const workDate = new Date(dto.work_date);
    this.validatePastOrCurrentDate(workDate);

    const isDuplicate =
      await this.attendanceRequestService.checkDuplicateRequest(
        dto.user_id,
        workDate,
        'FORGOT_CHECKIN',
      );
    if (isDuplicate)
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);

    if (dto.checkin_time && dto.checkout_time) {
      const checkin_time = new Date(
        `${workDate.toISOString().split('T')[0]} ${dto.checkin_time}`,
      );
      const checkout_time = new Date(
        `${workDate.toISOString().split('T')[0]} ${dto.checkout_time}`,
      );
      if (checkout_time <= checkin_time)
        throw new BadRequestException(REQUEST_ERRORS.INVALID_TIME_RANGE);
    }

    let timesheet = await this.prisma.time_sheets.findFirst({
      where: { user_id: dto.user_id, work_date: workDate },
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

    const attendanceRequest =
      await this.attendanceRequestService.createAttendanceRequest({
        user_id: dto.user_id,
        timesheet_id: timesheet.id,
        work_date: workDate,
        request_type: 'FORGOT_CHECKIN',
        title: dto.title,
        reason: dto.reason,
      });

    const checkinDateTime = dto.checkin_time
      ? new Date(`${workDate.toISOString().split('T')[0]} ${dto.checkin_time}`)
      : undefined;
    const checkoutDateTime = dto.checkout_time
      ? new Date(`${workDate.toISOString().split('T')[0]} ${dto.checkout_time}`)
      : undefined;

    await this.forgotCheckinDetailService.createForgotCheckinDetail({
      request_id: attendanceRequest.id,
      checkin_time: checkinDateTime,
      checkout_time: checkoutDateTime,
    });

    const fullRequest = await this.attendanceRequestService.findOne(
      attendanceRequest.id,
    );
    return this.mapToForgotCheckinRequestResponse(fullRequest);
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

    const whereConditions: any = {
      deleted_at: null,
      request_type: 'FORGOT_CHECKIN',
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
      this.prisma.attendance_requests.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  code: true,
                  avatar: true,
                },
              },
            },
          },
          forgot_checkin_request: true,
        },
        skip,
        take,
        orderBy,
      }),
      this.attendanceRequestService.count(whereConditions),
    ]);

    return buildPaginationResponse(
      requests.map((r) => this.mapToForgotCheckinRequestResponse(r)),
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
      request_type: 'FORGOT_CHECKIN',
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
      this.prisma.attendance_requests.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  code: true,
                  avatar: true,
                },
              },
            },
          },
          forgot_checkin_request: true,
        },
        skip,
        take,
        orderBy,
      }),
      this.attendanceRequestService.count(whereConditions),
    ]);

    return buildPaginationResponse(
      requests.map((r) => this.mapToForgotCheckinRequestResponse(r)),
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async approveForgotCheckinRequest(
    id: number,
    authContext: AuthorizationContext,
  ): Promise<ApprovalResult> {
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'FORGOT_CHECKIN') {
      throw new NotFoundException(
        REQUEST_ERRORS.FORGOT_CHECKIN_REQUEST_NOT_FOUND,
      );
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_APPROVE_NON_PENDING);
    }

    const canApprove = await authContext.canApproveRequest(
      request.user_id,
      'forgot-checkin',
    );

    if (!canApprove) {
      throw new ForbiddenException(
        REQUEST_ERRORS.CANNOT_APPROVE_REQUEST_PERMISSION,
      );
    }

    await this.prisma.$transaction(async (prisma) => {
      await this.attendanceRequestService.approve(id, authContext.userId);

      if (
        request.timesheet_id &&
        (request.forgot_checkin_request?.checkin_time ||
          request.forgot_checkin_request?.checkout_time)
      ) {
        const updateData: any = {
          forgot_checkin_approved: true,
        };

        if (request.forgot_checkin_request.checkin_time) {
          updateData.checkin = request.forgot_checkin_request.checkin_time;
        }

        if (request.forgot_checkin_request.checkout_time) {
          updateData.checkout = request.forgot_checkin_request.checkout_time;
        }

        await prisma.time_sheets.update({
          where: { id: request.timesheet_id },
          data: updateData,
        });
      }
    });

    const updatedRequest = await this.attendanceRequestService.findOne(id);

    return {
      success: true,
      message: SUCCESS_MESSAGES.FORGOT_CHECKIN_APPROVED,
      data: this.mapToForgotCheckinRequestResponse(updatedRequest),
    };
  }

  async rejectForgotCheckinRequest(
    id: number,
    authContext: AuthorizationContext,
    rejectedReason: string,
  ): Promise<ApprovalResult> {
    const request = await this.attendanceRequestService.findOne(id);

    if (!request || request.request_type !== 'FORGOT_CHECKIN') {
      throw new NotFoundException(
        REQUEST_ERRORS.FORGOT_CHECKIN_REQUEST_NOT_FOUND,
      );
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.CANNOT_REJECT_NON_PENDING);
    }

    const canReject = await authContext.canApproveRequest(
      request.user_id,
      'forgot-checkin',
    );

    if (!canReject) {
      throw new ForbiddenException(
        REQUEST_ERRORS.CANNOT_REJECT_REQUEST_PERMISSION,
      );
    }

    await this.attendanceRequestService.reject(
      id,
      authContext.userId,
      rejectedReason,
    );

    const updatedRequest = await this.attendanceRequestService.findOne(id);

    return {
      success: true,
      message: SUCCESS_MESSAGES.FORGOT_CHECKIN_REJECTED,
      data: this.mapToForgotCheckinRequestResponse(updatedRequest),
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

  private async getUserIdsByRole(role_name: string): Promise<number[]> {
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
      const divisionHeaduser_ids = await this.getUserIdsByRole(
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

    const isAdmin = approverRoles.roles.some(
      (r) => r.name === ROLE_NAMES.ADMIN,
    );

    if (isAdmin) {
      return true;
    }

    if (approverId === requestUserId) {
      return false;
    }

    // Division Head: Approve trong division của mình
    const approverDivisions = approverRoles.roles
      .filter(
        (r) =>
          r.name === ROLE_NAMES.DIVISION_HEAD && r.scope_type === 'DIVISION',
      )
      .map((r) => r.scope_id);

    if (approverDivisions.length > 0) {
      const ownerInSameDivision = ownerRoles.roles.some(
        (r) =>
          r.scope_type === 'DIVISION' && approverDivisions.includes(r.scope_id),
      );
      if (ownerInSameDivision) {
        return true;
      }
    }

    // Team Leader: Approve trong team của mình
    const approverTeams = approverRoles.roles
      .filter(
        (r) => r.name === ROLE_NAMES.TEAM_LEADER && r.scope_type === 'TEAM',
      )
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
      .filter(
        (r) =>
          r.name === ROLE_NAMES.PROJECT_MANAGER && r.scope_type === 'PROJECT',
      )
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
          (r) =>
            r.scope_type === 'TEAM' &&
            r.scope_id !== undefined &&
            projectTeamIds.includes(r.scope_id),
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
  private async determineAccessScope(user_id: number): Promise<{
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
    const isAdmin = userRoles.roles.some((r) => r.name === ROLE_NAMES.ADMIN);
    if (isAdmin) {
      return {
        type: 'ALL_ACCESS',
        user_id: user_id,
      };
    }

    // Collect all scopes from ALL roles user has
    const managedDivisions = userRoles.roles
      .filter(
        (r) =>
          r.name === ROLE_NAMES.DIVISION_HEAD && r.scope_type === 'DIVISION',
      )
      .map((r) => r.scope_id)
      .filter((id): id is number => id !== null);

    const managedTeams = userRoles.roles
      .filter(
        (r) => r.name === ROLE_NAMES.TEAM_LEADER && r.scope_type === 'TEAM',
      )
      .map((r) => r.scope_id)
      .filter((id): id is number => id !== null);

    const managedProjects = userRoles.roles
      .filter(
        (r) =>
          r.name === ROLE_NAMES.PROJECT_MANAGER && r.scope_type === 'PROJECT',
      )
      .map((r) => r.scope_id)
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
      const teamMemberAssignments =
        await this.prisma.user_role_assignment.findMany({
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
    const existing = await this.attendanceRequestService.findOne(id);

    if (!existing || existing.request_type !== 'REMOTE_WORK') {
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

    const conflictingRequest = await this.prisma.attendance_requests.findFirst({
      where: {
        id: { not: id },
        user_id: dto.user_id,
        work_date: workDate,
        request_type: 'REMOTE_WORK',
        deleted_at: null,
      },
    });

    if (conflictingRequest) {
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);
    }

    const dayOff = await this.prisma.attendance_requests.findFirst({
      where: {
        user_id: dto.user_id,
        work_date: workDate,
        request_type: 'DAY_OFF',
        status: 'APPROVED',
        deleted_at: null,
      },
    });

    if (dayOff) {
      throw new BadRequestException(REQUEST_ERRORS.REQUEST_ALREADY_EXISTS);
    }

    await this.attendanceRequestService.update(id, {
      work_date: workDate,
      title: dto.title,
      reason: dto.reason,
    });

    if (existing.remote_work_request) {
      await this.remoteWorkDetailService.update(
        existing.remote_work_request.id,
        {
          remote_type: dto.remote_type,
          duration: dto.duration,
        },
      );
    }

    const updated = await this.attendanceRequestService.findOne(id);

    return this.mapToRemoteWorkRequestResponse(updated);
  }

  async deleteRequest(id: number, user_id: number) {
    const existing = await this.attendanceRequestService.findOne(id);

    if (!existing) {
      throw new NotFoundException(REQUEST_ERRORS.REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_DELETE_PENDING);
    }

    await this.attendanceRequestService.softDelete(id);

    const logTypeMap = {
      REMOTE_WORK: 'remote_work',
      DAY_OFF: 'day_off',
      OVERTIME: 'overtime',
      LATE_EARLY: 'late_early',
      FORGOT_CHECKIN: 'forgot_checkin',
    };

    return { success: true, message: SUCCESS_MESSAGES.DELETED_SUCCESSFULLY };
  }

  async deleteRemoteWorkRequest(id: number, user_id: number) {
    return this.deleteRequest(id, user_id);
  }

  async updateDayOffRequest(
    id: number,
    dto: CreateDayOffRequestDto,
    user_id: number,
  ) {
    const existing = await this.attendanceRequestService.findOne(id);

    if (!existing || existing.request_type !== 'DAY_OFF') {
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

    const conflictingDayOff = await this.prisma.attendance_requests.findFirst({
      where: {
        id: { not: id },
        user_id: dto.user_id,
        work_date: workDate,
        request_type: 'DAY_OFF',
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

    await this.attendanceRequestService.update(id, {
      work_date: workDate,
      title: dto.title,
      reason: dto.reason,
    });

    if (existing.day_off) {
      await this.dayOffDetailService.update(existing.day_off.id, {
        duration: dto.duration,
        type: dto.type,
        is_past: dto.is_past ?? false,
      });
    }

    const updated = await this.attendanceRequestService.findOne(id);

    return this.mapToDayOffRequestResponse(updated);
  }

  async deleteDayOffRequest(id: number, user_id: number) {
    return this.deleteRequest(id, user_id);
  }

  async updateOvertimeRequest(
    id: number,
    dto: CreateOvertimeRequestDto,
    user_id: number,
  ) {
    const existing = await this.attendanceRequestService.findOne(id);

    if (!existing || existing.request_type !== 'OVERTIME') {
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

    const conflictingOvertime = await this.prisma.attendance_requests.findFirst(
      {
        where: {
          id: { not: id },
          user_id: dto.user_id,
          work_date: workDate,
          request_type: 'OVERTIME',
          deleted_at: null,
          status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED] },
        },
      },
    );

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

    const startTime = new Date(
      `${workDate.toISOString().split('T')[0]} ${dto.start_time}`,
    );
    const endTime = new Date(
      `${workDate.toISOString().split('T')[0]} ${dto.end_time}`,
    );

    await this.attendanceRequestService.update(id, {
      work_date: workDate,
      title: dto.title,
      reason: dto.reason,
    });

    if (existing.overtime) {
      await this.overtimeDetailService.update(existing.overtime.id, {
        start_time: startTime,
        end_time: endTime,
        total_hours: totalHours,
        hourly_rate: hourlyRate,
        total_amount: totalAmount,
      });
    }

    const updated = await this.attendanceRequestService.findOne(id);

    return this.mapToOvertimeRequestResponse(updated);
  }

  async deleteOvertimeRequest(id: number, user_id: number) {
    return this.deleteRequest(id, user_id);
  }

  async updateLateEarlyRequest(
    id: number,
    dto: CreateLateEarlyRequestDto,
    user_id: number,
  ) {
    const existing = await this.attendanceRequestService.findOne(id);

    if (!existing || existing.request_type !== 'LATE_EARLY') {
      throw new NotFoundException(REQUEST_ERRORS.LATE_EARLY_REQUEST_NOT_FOUND);
    }

    if (existing.user_id !== user_id) {
      throw new ForbiddenException(REQUEST_ERRORS.NOT_HAVE_PERMISSION);
    }

    if (existing.status !== ApprovalStatus.REJECTED) {
      throw new BadRequestException(REQUEST_ERRORS.ONLY_UPDATE_REJECTED);
    }

    await this.validateUser(dto.user_id);

    const workDate = new Date(dto.work_date);

    const conflictingRequest = await this.prisma.attendance_requests.findFirst({
      where: {
        id: { not: id },
        user_id: dto.user_id,
        work_date: workDate,
        request_type: 'LATE_EARLY',
        deleted_at: null,
      },
    });

    if (conflictingRequest) {
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

    await this.attendanceRequestService.update(id, {
      work_date: workDate,
      title: dto.title,
      reason: dto.reason,
    });

    if (existing.late_early_request) {
      await this.lateEarlyDetailService.update(existing.late_early_request.id, {
        request_type: dto.request_type,
        late_minutes: dto.late_minutes || null,
        early_minutes: dto.early_minutes || null,
      });
    }

    const updated = await this.attendanceRequestService.findOne(id);

    return this.mapToLateEarlyRequestResponse(updated);
  }

  async deleteLateEarlyRequest(id: number, user_id: number) {
    return this.deleteRequest(id, user_id);
  }

  async updateForgotCheckinRequest(
    id: number,
    dto: CreateForgotCheckinRequestDto,
    user_id: number,
  ) {
    const existing = await this.attendanceRequestService.findOne(id);

    if (!existing || existing.request_type !== 'FORGOT_CHECKIN') {
      throw new NotFoundException(
        REQUEST_ERRORS.FORGOT_CHECKIN_REQUEST_NOT_FOUND,
      );
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

    const conflictingRequest = await this.prisma.attendance_requests.findFirst({
      where: {
        id: { not: id },
        user_id: dto.user_id,
        work_date: workDate,
        request_type: 'FORGOT_CHECKIN',
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

    await this.attendanceRequestService.update(id, {
      work_date: workDate,
      title: dto.title,
      reason: dto.reason,
    });

    if (existing.forgot_checkin_request) {
      await this.forgotCheckinDetailService.update(
        existing.forgot_checkin_request.id,
        {
          checkin_time: checkinDateTime,
          checkout_time: checkoutDateTime,
        },
      );
    }

    const updated = await this.attendanceRequestService.findOne(id);

    return this.mapToForgotCheckinRequestResponse(updated);
  }

  async deleteForgotCheckinRequest(id: number, user_id: number) {
    return this.deleteRequest(id, user_id);
  }

  private mapToRemoteWorkRequestResponse(
    request: any,
  ): RemoteWorkRequestResponseDto {
    return {
      id: request.id,
      user_id: request.user_id,
      work_date: request.work_date,
      remote_type: request.remote_work_request?.remote_type,
      duration: request.remote_work_request?.duration,
      title: request.title,
      reason: request.reason,
      status: request.status,
      approved_by: request.approved_by,
      approved_at: request.approved_at,
      rejected_reason: request.rejected_reason,
      created_at: request.created_at,
      updated_at: request.updated_at,
    } as RemoteWorkRequestResponseDto;
  }

  private mapToOvertimeRequestResponse(
    request: any,
  ): OvertimeRequestResponseDto {
    return {
      id: request.id,
      user_id: request.user_id,
      work_date: request.work_date,
      title: request.title,
      start_time:
        request.overtime?.start_time?.toTimeString().slice(0, 5) || '',
      end_time: request.overtime?.end_time?.toTimeString().slice(0, 5) || '',
      total_hours: request.overtime?.total_hours || null,
      hourly_rate: null,
      total_amount: null,
      reason: request.reason,
      status: request.status,
      approved_by: request.approved_by,
      approved_at: request.approved_at,
      rejected_reason: request.rejected_reason,
      created_at: request.created_at,
      updated_at: request.updated_at,
      deleted_at: request.deleted_at,
    };
  }

  private mapToDayOffRequestResponse(request: any): DayOffRequestResponseDto {
    return {
      id: request.id,
      user_id: request.user_id,
      work_date: request.work_date,
      duration: request.day_off?.duration,
      type: request.day_off?.type,
      is_past: request.day_off?.is_past || false,
      title: request.title,
      reason: request.reason,
      status: request.status,
      approved_by: request.approved_by,
      approved_at: request.approved_at,
      rejected_reason: request.rejected_reason,
      created_at: request.created_at,
      updated_at: request.updated_at,
      deleted_at: request.deleted_at,
    };
  }

  private mapToLateEarlyRequestResponse(
    request: any,
  ): LateEarlyRequestResponseDto {
    return {
      id: request.id,
      user_id: request.user_id,
      work_date: request.work_date,
      request_type: request.late_early_request?.request_type,
      late_minutes: request.late_early_request?.late_minutes || null,
      early_minutes: request.late_early_request?.early_minutes || null,
      title: request.title,
      reason: request.reason,
      status: request.status,
      approved_by: request.approved_by,
      approved_at: request.approved_at,
      rejected_reason: request.rejected_reason,
      timesheet_id: request.timesheet_id,
      created_at: request.created_at,
      updated_at: request.updated_at,
    };
  }

  private mapToForgotCheckinRequestResponse(
    request: any,
  ): ForgotCheckinRequestResponseDto {
    return {
      id: request.id,
      user_id: request.user_id,
      work_date: request.work_date,
      checkin_time:
        request.forgot_checkin_request?.checkin_time
          ?.toTimeString()
          .slice(0, 5) || null,
      checkout_time:
        request.forgot_checkin_request?.checkout_time
          ?.toTimeString()
          .slice(0, 5) || null,
      title: request.title,
      reason: request.reason,
      status: request.status,
      approved_by: request.approved_by,
      approved_at: request.approved_at,
      rejected_reason: request.rejected_reason,
      created_at: request.created_at,
      updated_at: request.updated_at,
    } as ForgotCheckinRequestResponseDto;
  }
}
