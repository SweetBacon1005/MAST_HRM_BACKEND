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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  // === OVERVIEW ENDPOINTS ===

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Lấy tất cả requests từ mọi loại có phân trang thống nhất (Admin/Manager)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getAllRequests(@Query() paginationDto: RequestPaginationDto) {
    return await this.requestsService.getAllRequests(paginationDto);
  }

  @Get('my/all')
  @ApiOperation({
    summary: 'Lấy tất cả requests của tôi có phân trang thống nhất',
  })
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
    enum: ['remote-work', 'day-off', 'overtime', 'late-early', 'forgot-checkin'],
    example: 'day-off',
  })
  @ApiParam({ name: 'id', description: 'ID của request', example: 1 })
  @ApiResponse({ status: 200, description: 'Duyệt thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy request' })
  async approveRequest(
    @Param('type') type: 'remote-work' | 'day-off' | 'overtime' | 'late-early' | 'forgot-checkin',
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
    enum: ['remote-work', 'day-off', 'overtime', 'late-early', 'forgot-checkin'],
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
    @Param('type') type: 'remote-work' | 'day-off' | 'overtime' | 'late-early' | 'forgot-checkin',
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
    type: ForgotCheckinRequestResponseDto 
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
  @ApiOperation({ summary: 'Lấy tất cả đơn xin bổ sung chấm công (Admin/Manager)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getAllForgotCheckinRequests(
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findAllForgotCheckinRequests(paginationDto);
  }

  @Get('forgot-checkin/my')
  @ApiOperation({ summary: 'Lấy đơn xin bổ sung chấm công của tôi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getMyForgotCheckinRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyForgotCheckinRequests(userId, paginationDto);
  }

}
