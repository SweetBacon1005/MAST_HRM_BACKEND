import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { REQUEST_PERMISSIONS } from '../auth/constants/permission.constants';
import { CreateDayOffRequestDto } from '../timesheet/dto/create-day-off-request.dto';
import { CreateOvertimeRequestDto } from '../timesheet/dto/create-overtime-request.dto';
import { CreateLateEarlyRequestDto } from './dto/create-late-early-request.dto';
import { CreateRemoteWorkRequestDto } from './dto/create-remote-work-request.dto';
import { CreateForgotCheckinRequestDto } from './dto/create-forgot-checkin-request.dto';
import {
  RemoteWorkRequestPaginationDto,
  RequestPaginationDto,
} from './dto/request-pagination.dto';
import { DayOffRequestResponseDto } from './dto/response/day-off-request-response.dto';
import { OvertimeRequestResponseDto } from './dto/response/overtime-request-response.dto';
import { RemoteWorkRequestResponseDto } from './dto/response/remote-work-request-response.dto';
import { ForgotCheckinRequestResponseDto } from './dto/response/forgot-checkin-request-response.dto';
import { RequestType } from './interfaces/request.interface';
import { RequestsService } from './requests.service';

@ApiTags('Requests')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get('my/all')
  @RequirePermission(REQUEST_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Lấy tất cả requests của tôi có phân trang' })
  @ApiResponse({ status: 200, })
  async getAllMyRequests(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.getAllMyRequests(user_id, paginationDto);
  }

  @Get('my/stats')
  @ApiOperation({ summary: 'Thống kê requests của tôi' })
  @ApiResponse({ status: 200, })
  async getMyRequestsStats(@GetCurrentUser('id') user_id: number) {
    return await this.requestsService.getMyRequestsStats(user_id);
  }

  // === REMOTE WORK REQUESTS ===

  @Post('remote-work')
  @ApiOperation({ summary: 'Tạo đơn xin làm việc từ xa' })
  @ApiResponse({ status: 201, })
  @ApiResponse({ status: 400, })
  async createRemoteWorkRequest(
    @Body() createRemoteWorkRequestDto: CreateRemoteWorkRequestDto,
    @GetCurrentUser('id') user_id: number,
  ): Promise<RemoteWorkRequestResponseDto> {
    createRemoteWorkRequestDto.user_id = user_id;
    return await this.requestsService.createRemoteWorkRequest(
      createRemoteWorkRequestDto,
    );
  }

  @Get('remote-work')
  @RequirePermission(REQUEST_PERMISSIONS.READ)
  @ApiOperation({
    summary:
      'Lấy danh sách tất cả đơn remote work (Admin/Division Head/Manager)',
    })
  @ApiResponse({ status: 200, })
  async findAllRemoteWorkRequests(
    @GetCurrentUser('id') user_id: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() paginationDto: RemoteWorkRequestPaginationDto,
  ) {
    const primaryRole = this.getPrimaryRole(userRoles);
    return await this.requestsService.findAllRemoteWorkRequests(
      paginationDto,
      user_id,
      primaryRole,
    );
  }

  @Get('remote-work/my')
  @ApiOperation({
    summary: 'Lấy danh sách đơn remote work của tôi có phân trang',
  })
  @ApiResponse({ status: 200, })
  async findMyRemoteWorkRequests(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: RemoteWorkRequestPaginationDto,
  ) {
    return await this.requestsService.findMyRemoteWorkRequests(
      user_id,
      paginationDto,
    );
  }

  // === DAY OFF REQUESTS ===

  @Post('day-off')
  @ApiOperation({ summary: 'Tạo đơn xin nghỉ phép' })
  @ApiResponse({ status: 201, })
  @ApiResponse({ status: 400, })
  async createDayOffRequest(
    @Body() createDayOffRequestDto: CreateDayOffRequestDto,
    @GetCurrentUser('id') user_id: number,
  ): Promise<DayOffRequestResponseDto> {
    createDayOffRequestDto.user_id = user_id;
    return await this.requestsService.createDayOffRequest(
      createDayOffRequestDto,
    );
  }

  @Get('day-off')
  @RequirePermission(REQUEST_PERMISSIONS.READ)
  @ApiOperation({
    summary: 'Lấy danh sách tất cả đơn nghỉ phép (Admin/Division Head/Manager)',
    })
  @ApiResponse({ status: 200, })
  async findAllDayOffRequests(
    @GetCurrentUser('id') user_id: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() paginationDto: RequestPaginationDto,
  ) {
    const primaryRole = this.getPrimaryRole(userRoles);
    return await this.requestsService.findAllDayOffRequests(paginationDto, user_id, primaryRole);
  }

  @Get('day-off/my')
  @ApiOperation({
    summary: 'Lấy danh sách đơn nghỉ phép của tôi có phân trang',
  })
  @ApiResponse({ status: 200, })
  async findMyDayOffRequests(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyDayOffRequests(
      user_id,
      paginationDto,
    );
  }

  // === OVERTIME REQUESTS ===

  @Post('overtime')
  @ApiOperation({ summary: 'Tạo đơn xin làm thêm giờ' })
  @ApiResponse({ status: 201, })
  @ApiResponse({ status: 400, })
  async createOvertimeRequest(
    @Body() createOvertimeRequestDto: CreateOvertimeRequestDto,
    @GetCurrentUser('id') user_id: number,
  ): Promise<OvertimeRequestResponseDto> {
    createOvertimeRequestDto.user_id = user_id;
    return await this.requestsService.createOvertimeRequest(
      createOvertimeRequestDto,
    );
  }

  @Get('overtime')
  @RequirePermission(REQUEST_PERMISSIONS.READ)
  @ApiOperation({
    summary: 'Lấy danh sách tất cả đơn làm thêm giờ (Admin/Division Head/Manager)',
    })
  @ApiResponse({ status: 200, })
  async findAllOvertimeRequests(
    @GetCurrentUser('id') user_id: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() paginationDto: RequestPaginationDto,
  ) {
    const primaryRole = this.getPrimaryRole(userRoles);
    return await this.requestsService.findAllOvertimeRequests(paginationDto, user_id, primaryRole);
  }

  @Get('overtime/my')
  @ApiOperation({
    summary: 'Lấy danh sách đơn làm thêm giờ của tôi có phân trang',
  })
  @ApiResponse({ status: 200, })
  async findMyOvertimeRequests(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyOvertimeRequests(
      user_id,
      paginationDto,
    );
  }

  // === LEAVE BALANCE ENDPOINTS ===

  @Get('leave-balance')
  @ApiOperation({ summary: 'Lấy thông tin leave balance của tôi' })
  @ApiResponse({ status: 200, })
  async getMyLeaveBalance(@GetCurrentUser('id') user_id: number) {
    return await this.requestsService.getMyLeaveBalance(user_id);
  }

  @Get('leave-balance/transactions')
  @ApiOperation({ summary: 'Lấy lịch sử giao dịch leave balance' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, })
  async getMyLeaveTransactionHistory(
    @GetCurrentUser('id') user_id: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.requestsService.getMyLeaveTransactionHistory(
      user_id,
      limit || 50,
      offset || 0,
    );
  }

  @Post('leave-balance/check')
  @ApiOperation({ summary: 'Kiểm tra có đủ leave balance để tạo đơn không' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        leave_type: {
          type: 'string',
          enum: ['PAID', 'UNPAID'],
          example: 'PAID',
        },
        requested_days: {
          type: 'number',
          example: 2,
        },
      },
      required: ['leave_type', 'requested_days'],
    },
  })
  @ApiResponse({ status: 200, })
  async checkLeaveBalanceAvailability(
    @GetCurrentUser('id') user_id: number,
    @Body('leave_type') leaveType: 'PAID' | 'UNPAID',
    @Body('requested_days') requestedDays: number,
  ) {
    return await this.requestsService.checkLeaveBalanceAvailability(
      user_id,
      leaveType as any,
      requestedDays,
    );
  }

  // === LATE/EARLY REQUEST ENDPOINTS ===

  @Post('late-early')
  @ApiOperation({ summary: 'Tạo request đi muộn/về sớm' })
  @ApiResponse({ status: 201, })
  @ApiResponse({ status: 400, })
  async createLateEarlyRequest(
    @Body() dto: CreateLateEarlyRequestDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    dto.user_id = user_id;
    return await this.requestsService.createLateEarlyRequest(dto);
  }

  @Get('late-early')
  @RequirePermission(REQUEST_PERMISSIONS.READ)
  @ApiOperation({
    summary: 'Lấy danh sách tất cả late/early requests (Admin/Division Head/Manager)',
    })
  @ApiResponse({ status: 200, })
  async getAllLateEarlyRequests(
    @GetCurrentUser('id') user_id: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() paginationDto: RequestPaginationDto,
  ) {
    const primaryRole = this.getPrimaryRole(userRoles);
    return await this.requestsService.findAllLateEarlyRequests(paginationDto, user_id, primaryRole);
  }

  @Get('late-early/my')
  @ApiOperation({
    summary: 'Lấy danh sách late/early requests của tôi có phân trang',
  })
  @ApiResponse({ status: 200, })
  async getMyLateEarlyRequests(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyLateEarlyRequests(
      user_id,
      paginationDto,
    );
  }

  // === UNIVERSAL APPROVE/REJECT ENDPOINTS ===

  @Post(':type/:id/approve')
  @RequirePermission(REQUEST_PERMISSIONS.APPROVE)
  @ApiOperation({
    summary: 'Duyệt request (tất cả loại)',
    })
  @ApiParam({
    name: 'type',
    enum: [
      'remote-work',
      'day-off',
      'overtime',
      'late-early',
      'forgot-checkin',
    ],
    example: 'day-off',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, })
  @ApiResponse({ status: 404, })
  async approveRequest(
    @Param('type')
    type:
      | 'remote-work'
      | 'day-off'
      | 'overtime'
      | 'late-early'
      | 'forgot-checkin',
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') approverId: number,
    @GetCurrentUser('roles') approverRoles: string[],
  ) {
    const primaryRole = this.getPrimaryRole(approverRoles);
    return await this.requestsService.approveRequest(
      type as RequestType,
      id,
      approverId,
      primaryRole,
    );
  }

  @Post(':type/:id/reject')
  @RequirePermission(REQUEST_PERMISSIONS.REJECT)
  @ApiOperation({
    summary: 'Từ chối request (tất cả loại)',
    })
  @ApiParam({
    name: 'type',
    enum: [
      'remote-work',
      'day-off',
      'overtime',
      'late-early',
      'forgot-checkin',
    ],
    example: 'day-off',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rejected_reason: {
          type: 'string',
          example: 'Không có lý do chính đáng',
        },
      },
      required: ['rejected_reason'],
    },
  })
  @ApiResponse({ status: 200, })
  @ApiResponse({ status: 404, })
  async rejectRequest(
    @Param('type')
    type:
      | 'remote-work'
      | 'day-off'
      | 'overtime'
      | 'late-early'
      | 'forgot-checkin',
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') rejectorId: number,
    @GetCurrentUser('roles') rejectorRoles: string[],
    @Body('rejected_reason') rejectedReason: string,
  ) {
    const primaryRole = this.getPrimaryRole(rejectorRoles);
    return await this.requestsService.rejectRequest(
      type as RequestType,
      id,
      rejectorId,
      primaryRole,
      rejectedReason,
    );
  }

  // ==================== FORGOT CHECKIN ENDPOINTS ====================

  @Post('forgot-checkin')
  @ApiOperation({ summary: 'Tạo đơn xin bổ sung chấm công' })
  @ApiBody({ type: CreateForgotCheckinRequestDto })
  @ApiResponse({
    status: 201,
    type: ForgotCheckinRequestResponseDto,
  })
  @ApiResponse({ status: 400, })
  async createForgotCheckinRequest(
    @Body() dto: CreateForgotCheckinRequestDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    dto.user_id = user_id;
    return await this.requestsService.createForgotCheckinRequest(dto);
  }

  @Get('forgot-checkin')
  @RequirePermission(REQUEST_PERMISSIONS.READ)
  @ApiOperation({
    summary: 'Lấy tất cả đơn xin bổ sung chấm công (Admin/Division Head/Manager)',
    })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  @ApiResponse({ status: 200, })
  async getAllForgotCheckinRequests(
    @GetCurrentUser('id') user_id: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() paginationDto: RequestPaginationDto,
  ) {
    const primaryRole = this.getPrimaryRole(userRoles);
    return await this.requestsService.findAllForgotCheckinRequests(paginationDto, user_id, primaryRole);
  }

  @Get('forgot-checkin/my')
  @ApiOperation({ summary: 'Lấy đơn xin bổ sung chấm công của tôi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  @ApiResponse({ status: 200, })
  async getMyForgotCheckinRequests(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyForgotCheckinRequests(
      user_id,
      paginationDto,
    );
  }

  @Get(':type/:id')
  @RequirePermission(REQUEST_PERMISSIONS.READ)
  @ApiOperation({
    summary: 'Lấy chi tiết request theo ID và loại',
  })
  @ApiParam({
    name: 'type',
    enum: ['remote_work', 'day_off', 'overtime', 'late_early', 'forgot_checkin'],
  })
  @ApiParam({
    name: 'id',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        type: { 
          type: 'string',
          enum: ['remote_work', 'day_off', 'overtime', 'late_early', 'forgot_checkin']
        },
        user_id: { type: 'number' },
        status: { type: 'string' },
        work_date: { type: 'string', format: 'date' },
        created_at: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            user_information: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                position: { type: 'object' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, })
  @ApiResponse({ status: 403, })
  async getRequestById(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
    @GetCurrentUser('roles') userRoles: string[],
  ) {
    return await this.requestsService.getRequestById(id, type, user_id, userRoles);
  }

  // Generic route - MUST be last to avoid blocking specific routes
  @Get()
  @RequirePermission(REQUEST_PERMISSIONS.READ)
  @ApiOperation({
    summary: 'Lấy requests theo phân quyền role với enhanced filtering',
    })
  @ApiQuery({
    name: 'division_id',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'leads_only',
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'requester_role',
    required: false,
    enum: Object.values(ROLE_NAMES),
  })
  @ApiQuery({
    name: 'team_id',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'high_priority_only',
    required: false,
    type: Boolean,
  })
  @ApiResponse({ 
    status: 200, 
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              type: { 
                type: 'string',
                enum: ['remote_work', 'day_off', 'overtime', 'late_early', 'forgot_checkin']
              },
              user_id: { type: 'number' },
              status: { type: 'string' },
              work_date: { type: 'string', format: 'date' },
              created_at: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  email: { type: 'string' },
                  user_information: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      position: { type: 'string' },
                    },
                  },
                  user_roles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        role: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            total_pages: { type: 'number' },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            access_scope: { 
              type: 'string',
              enum: ['DIVISION_ONLY', 'ALL_ACCESS', 'TEAM_ONLY', 'SELF_ONLY'],
              },
            managed_divisions: {
              type: 'array',
              items: { type: 'number' },
              },
            managed_teams: {
              type: 'array', 
              items: { type: 'number' },
              },
            filters_applied: {
              type: 'object',
              properties: {
                leads_only: { type: 'boolean' },
                division_restriction: { type: 'boolean' },
                team_restriction: { type: 'boolean' },
                division_id: { type: 'number' },
                team_id: { type: 'number' },
                requester_role: { type: 'string' },
              },
              }
          },
          },
      },
    },
  })
  async getAllRequests(
    @GetCurrentUser('id') user_id: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() paginationDto: RequestPaginationDto,
  ) {
    const primaryRole = this.getPrimaryRole(userRoles);
    
    return await this.requestsService.getAllRequests(
      paginationDto,
      user_id,
      primaryRole,
    );
  }


  private getPrimaryRole(userRoles: string[] | undefined): string {
    if (!userRoles || userRoles.length === 0) {
      return ROLE_NAMES.EMPLOYEE;
    }

    const rolePriority = [
      ROLE_NAMES.ADMIN,
      ROLE_NAMES.DIVISION_HEAD,
      ROLE_NAMES.TEAM_LEADER,
      ROLE_NAMES.PROJECT_MANAGER,
      ROLE_NAMES.EMPLOYEE,
    ];

    for (const role of rolePriority) {
      if (userRoles.includes(role)) {
        return role;
      }
    }

    return ROLE_NAMES.EMPLOYEE;
  }

  @Patch('remote-work/:id')
  async updateRemoteWork(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRemoteWorkRequestDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.updateRemoteWorkRequest(id, dto, user_id);
  }

  @Delete('remote-work/:id')
  async deleteRemoteWork(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.deleteRemoteWorkRequest(id, user_id);
  }

  @Patch('day-off/:id')
  async updateDayOff(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDayOffRequestDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.updateDayOffRequest(id, dto, user_id);
  }

  @Delete('day-off/:id')
  async deleteDayOff(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.deleteDayOffRequest(id, user_id);
  }

  @Patch('overtime/:id')
  async updateOvertime(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateOvertimeRequestDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.updateOvertimeRequest(id, dto, user_id);
  }

  @Delete('overtime/:id')
  async deleteOvertime(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.deleteOvertimeRequest(id, user_id);
  }

  @Patch('late-early/:id')
  async updateLateEarly(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLateEarlyRequestDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.updateLateEarlyRequest(id, dto, user_id);
  }

  @Delete('late-early/:id')
  async deleteLateEarly(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.deleteLateEarlyRequest(id, user_id);
  }

  @Patch('forgot-checkin/:id')
  async updateForgotCheckin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateForgotCheckinRequestDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.updateForgotCheckinRequest(id, dto, user_id);
  }

  @Delete('forgot-checkin/:id')
  async deleteForgotCheckin(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
  ) {
    return await this.requestsService.deleteForgotCheckinRequest(id, user_id);
  }}

