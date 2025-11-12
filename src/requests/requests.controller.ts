import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ROLE_NAMES } from '../auth/constants/role.constants';
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

  @Get()
  @RequirePermission('request.read')
  @ApiOperation({
    summary: 'Lấy requests theo phân quyền role với enhanced filtering',
    description: `
      Role-based access control:
      - Division Head: Chỉ thấy requests trong division của mình, có thể filter theo team
      - Admin/Super Admin: Thấy tất cả requests, có thể filter leads_only=true cho requests quan trọng
      - Project Manager/Team Leader: Chỉ thấy requests từ team members
      - Employee: Chỉ thấy requests của chính mình
      
      Enhanced filtering options:
      - leads_only: Chỉ requests từ leadership roles (Division Head, Project Manager, Team Leader, HR Manager)
      - team_id: Filter theo team cụ thể (Division Head có thể filter teams trong division)
      - high_priority_only: Chỉ requests có priority cao (từ leadership hoặc urgent criteria)
    `,
  })
  @ApiQuery({
    name: 'division_id',
    required: false,
    description: 'Lọc theo division ID (chỉ dành cho admin)',
    type: Number,
  })
  @ApiQuery({
    name: 'leads_only',
    required: false,
    description: 'Chỉ lấy requests từ các lead (team_leader, division_head, project_manager, hr_manager)',
    type: Boolean,
  })
  @ApiQuery({
    name: 'requester_role',
    required: false,
    description: 'Lọc theo role của người tạo request',
    enum: Object.values(ROLE_NAMES),
  })
  @ApiQuery({
    name: 'team_id',
    required: false,
    description: 'Lọc theo team ID (Division Head có thể filter teams trong division)',
    type: Number,
  })
  @ApiQuery({
    name: 'high_priority_only',
    required: false,
    description: 'Chỉ lấy requests có priority cao (từ leadership roles hoặc urgent requests)',
    type: Boolean,
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy danh sách thành công',
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
            totalPages: { type: 'number' },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            access_scope: { 
              type: 'string',
              enum: ['DIVISION_ONLY', 'ALL_ACCESS', 'TEAM_ONLY', 'SELF_ONLY'],
              description: 'Phạm vi truy cập của user hiện tại'
            },
            managed_divisions: {
              type: 'array',
              items: { type: 'number' },
              description: 'Danh sách division IDs mà user quản lý (nếu là Division Head)'
            },
            managed_teams: {
              type: 'array', 
              items: { type: 'number' },
              description: 'Danh sách team IDs mà user quản lý (nếu là Team Leader/Project Manager)'
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
              description: 'Các filters đã được áp dụng'
            }
          },
          description: 'Metadata về phạm vi truy cập và filters áp dụng'
        },
      },
    },
  })
  async getAllRequests(
    @GetCurrentUser('id') userId: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() paginationDto: RequestPaginationDto,
  ) {
    // Xác định role chính của user
    const primaryRole = this.getPrimaryRole(userRoles);
    
    return await this.requestsService.getAllRequests(
      paginationDto,
      userId,
      primaryRole,
    );
  }

  @Get('my/all')
  @RequirePermission('request.read')
  @ApiOperation({ summary: 'Lấy tất cả requests của tôi có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getAllMyRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.getAllMyRequests(userId, paginationDto);
  }

  @Get('my/stats')
  @ApiOperation({ summary: 'Thống kê requests của tôi' })
  @ApiResponse({ status: 200, description: 'Lấy thống kê thành công' })
  async getMyRequestsStats(@GetCurrentUser('id') userId: number) {
    return await this.requestsService.getMyRequestsStats(userId);
  }

  // === REMOTE WORK REQUESTS ===

  @Post('remote-work')
  @ApiOperation({ summary: 'Tạo đơn xin làm việc từ xa' })
  @ApiResponse({ status: 201, description: 'Tạo đơn thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createRemoteWorkRequest(
    @Body() createRemoteWorkRequestDto: CreateRemoteWorkRequestDto,
    @GetCurrentUser('id') userId: number,
  ): Promise<RemoteWorkRequestResponseDto> {
    createRemoteWorkRequestDto.user_id = userId;
    return await this.requestsService.createRemoteWorkRequest(
      createRemoteWorkRequestDto,
    );
  }

  @Get('remote-work')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Lấy danh sách tất cả đơn remote work có phân trang (Admin/Manager)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAllRemoteWorkRequests(
    @Query() paginationDto: RemoteWorkRequestPaginationDto,
  ) {
    return await this.requestsService.findAllRemoteWorkRequests(paginationDto);
  }

  @Get('remote-work/my')
  @ApiOperation({
    summary: 'Lấy danh sách đơn remote work của tôi có phân trang',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findMyRemoteWorkRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RemoteWorkRequestPaginationDto,
  ) {
    return await this.requestsService.findMyRemoteWorkRequests(
      userId,
      paginationDto,
    );
  }

  // === DAY OFF REQUESTS ===

  @Post('day-off')
  @ApiOperation({ summary: 'Tạo đơn xin nghỉ phép' })
  @ApiResponse({ status: 201, description: 'Tạo đơn thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createDayOffRequest(
    @Body() createDayOffRequestDto: CreateDayOffRequestDto,
    @GetCurrentUser('id') userId: number,
  ): Promise<DayOffRequestResponseDto> {
    createDayOffRequestDto.user_id = userId;
    return await this.requestsService.createDayOffRequest(
      createDayOffRequestDto,
    );
  }

  @Get('day-off')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả đơn nghỉ phép có phân trang (Admin/Manager)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAllDayOffRequests(@Query() paginationDto: RequestPaginationDto) {
    return await this.requestsService.findAllDayOffRequests(paginationDto);
  }

  @Get('day-off/my')
  @ApiOperation({
    summary: 'Lấy danh sách đơn nghỉ phép của tôi có phân trang',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findMyDayOffRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyDayOffRequests(
      userId,
      paginationDto,
    );
  }

  // === OVERTIME REQUESTS ===

  @Post('overtime')
  @ApiOperation({ summary: 'Tạo đơn xin làm thêm giờ' })
  @ApiResponse({ status: 201, description: 'Tạo đơn thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createOvertimeRequest(
    @Body() createOvertimeRequestDto: CreateOvertimeRequestDto,
    @GetCurrentUser('id') userId: number,
  ): Promise<OvertimeRequestResponseDto> {
    createOvertimeRequestDto.user_id = userId;
    return await this.requestsService.createOvertimeRequest(
      createOvertimeRequestDto,
    );
  }

  @Get('overtime')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Lấy danh sách tất cả đơn làm thêm giờ có phân trang (Admin/Manager)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAllOvertimeRequests(@Query() paginationDto: RequestPaginationDto) {
    return await this.requestsService.findAllOvertimeRequests(paginationDto);
  }

  @Get('overtime/my')
  @ApiOperation({
    summary: 'Lấy danh sách đơn làm thêm giờ của tôi có phân trang',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findMyOvertimeRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyOvertimeRequests(
      userId,
      paginationDto,
    );
  }

  // === LEAVE BALANCE ENDPOINTS ===

  @Get('leave-balance')
  @ApiOperation({ summary: 'Lấy thông tin leave balance của tôi' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getMyLeaveBalance(@GetCurrentUser('id') userId: number) {
    return await this.requestsService.getMyLeaveBalance(userId);
  }

  @Get('leave-balance/transactions')
  @ApiOperation({ summary: 'Lấy lịch sử giao dịch leave balance' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getMyLeaveTransactionHistory(
    @GetCurrentUser('id') userId: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.requestsService.getMyLeaveTransactionHistory(
      userId,
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
  @ApiResponse({ status: 200, description: 'Thành công' })
  async checkLeaveBalanceAvailability(
    @GetCurrentUser('id') userId: number,
    @Body('leave_type') leaveType: 'PAID' | 'UNPAID',
    @Body('requested_days') requestedDays: number,
  ) {
    return await this.requestsService.checkLeaveBalanceAvailability(
      userId,
      leaveType as any,
      requestedDays,
    );
  }

  // === LATE/EARLY REQUEST ENDPOINTS ===

  @Post('late-early')
  @ApiOperation({ summary: 'Tạo request đi muộn/về sớm' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createLateEarlyRequest(
    @Body() dto: CreateLateEarlyRequestDto,
    @GetCurrentUser('id') userId: number,
  ) {
    dto.user_id = userId;
    return await this.requestsService.createLateEarlyRequest(dto);
  }

  @Get('late-early')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Lấy danh sách tất cả late/early requests có phân trang (Admin/Manager)',
  })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getAllLateEarlyRequests(@Query() paginationDto: RequestPaginationDto) {
    return await this.requestsService.findAllLateEarlyRequests(paginationDto);
  }

  @Get('late-early/my')
  @ApiOperation({
    summary: 'Lấy danh sách late/early requests của tôi có phân trang',
  })
  @ApiResponse({ status: 200, description: 'Thành công' })
  async getMyLateEarlyRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyLateEarlyRequests(
      userId,
      paginationDto,
    );
  }

  // === UNIVERSAL APPROVE/REJECT ENDPOINTS ===

  @Post(':type/:id/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Duyệt request (tất cả loại)' })
  @ApiParam({
    name: 'type',
    description: 'Loại request',
    enum: [
      'remote-work',
      'day-off',
      'overtime',
      'late-early',
      'forgot-checkin',
    ],
    example: 'day-off',
  })
  @ApiParam({ name: 'id', description: 'ID của request', example: 1 })
  @ApiResponse({ status: 200, description: 'Duyệt thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy request' })
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
  ) {
    return await this.requestsService.approveRequest(
      type as RequestType,
      id,
      approverId,
    );
  }

  @Post(':type/:id/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Từ chối request (tất cả loại)' })
  @ApiParam({
    name: 'type',
    description: 'Loại request',
    enum: [
      'remote-work',
      'day-off',
      'overtime',
      'late-early',
      'forgot-checkin',
    ],
    example: 'day-off',
  })
  @ApiParam({ name: 'id', description: 'ID của request', example: 1 })
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
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy request' })
  async rejectRequest(
    @Param('type')
    type:
      | 'remote-work'
      | 'day-off'
      | 'overtime'
      | 'late-early'
      | 'forgot-checkin',
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') approverId: number,
    @Body('rejected_reason') rejectedReason: string,
  ) {
    return await this.requestsService.rejectRequest(
      type as RequestType,
      id,
      approverId,
      rejectedReason,
    );
  }

  // ==================== FORGOT CHECKIN ENDPOINTS ====================

  @Post('forgot-checkin')
  @ApiOperation({ summary: 'Tạo đơn xin bổ sung chấm công' })
  @ApiBody({ type: CreateForgotCheckinRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Tạo đơn thành công',
    type: ForgotCheckinRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async createForgotCheckinRequest(
    @Body() dto: CreateForgotCheckinRequestDto,
    @GetCurrentUser('id') userId: number,
  ) {
    dto.user_id = userId;
    return await this.requestsService.createForgotCheckinRequest(dto);
  }

  @Get('forgot-checkin')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Lấy tất cả đơn xin bổ sung chấm công (Admin/Manager)',
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
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getAllForgotCheckinRequests(
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findAllForgotCheckinRequests(
      paginationDto,
    );
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
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getMyForgotCheckinRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyForgotCheckinRequests(
      userId,
      paginationDto,
    );
  }

  @Get(':type/:id')
  @RequirePermission('request.read')
  @ApiOperation({
    summary: 'Lấy chi tiết request theo ID và loại',
  })
  @ApiParam({
    name: 'type',
    description: 'Loại request',
    enum: ['remote_work', 'day_off', 'overtime', 'late_early', 'forgot_checkin'],
  })
  @ApiParam({
    name: 'id',
    description: 'ID của request',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết request thành công',
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
        // Các field khác tùy thuộc vào loại request
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy request' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập request này' })
  async getRequestById(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') userId: number,
    @GetCurrentUser('roles') userRoles: string[],
  ) {
    return await this.requestsService.getRequestById(id, type, userId, userRoles);
  }

  // === HELPER METHODS ===

  /**
   * Xác định role chính của user theo thứ tự ưu tiên
   */
  private getPrimaryRole(userRoles: string[] | undefined): string {
    // Handle undefined or empty roles
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

    // Default fallback
    return ROLE_NAMES.EMPLOYEE;
  }
}
