import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDayOffRequestDto } from '../timesheet/dto/create-day-off-request.dto';
import { CreateOvertimeRequestDto } from '../timesheet/dto/create-overtime-request.dto';
import { CreateRemoteWorkRequestDto } from './dto/create-remote-work-request.dto';
import { RequestPaginationDto, RemoteWorkRequestPaginationDto } from './dto/request-pagination.dto';
import { DayOffRequestResponseDto } from './dto/response/day-off-request-response.dto';
import { OvertimeRequestResponseDto } from './dto/response/overtime-request-response.dto';
import { RemoteWorkRequestResponseDto } from './dto/response/remote-work-request-response.dto';
import { RequestType } from './interfaces/request.interface';
import { RequestTypeValidationPipe } from './pipes/request-type-validation.pipe';
import { RequestsService } from './requests.service';

@ApiTags('Requests')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  // === OVERVIEW ENDPOINTS ===

  @Get('my/all')
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

  @Get('remote-work/my')
  @ApiOperation({ summary: 'Lấy danh sách đơn remote work của tôi có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findMyRemoteWorkRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RemoteWorkRequestPaginationDto,
  ) {
    return await this.requestsService.findMyRemoteWorkRequests(userId, paginationDto);
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

  @Get('day-off/my')
  @ApiOperation({ summary: 'Lấy danh sách đơn nghỉ phép của tôi có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findMyDayOffRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyDayOffRequests(userId, paginationDto);
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

  @Get('overtime/my')
  @ApiOperation({ summary: 'Lấy danh sách đơn làm thêm giờ của tôi có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findMyOvertimeRequests(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: RequestPaginationDto,
  ) {
    return await this.requestsService.findMyOvertimeRequests(userId, paginationDto);
  }

  // === APPROVAL ENDPOINTS (Manager/Admin only) ===

  @Patch(':type/:id/approve')
  @ApiOperation({ summary: 'Duyệt request (Manager/Admin only)' })
  @ApiParam({
    name: 'type',
    enum: RequestType,
    description: 'Loại request',
    example: RequestType.DAY_OFF,
  })
  @ApiParam({
    name: 'id',
    description: 'ID của request',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Duyệt thành công' })
  @ApiResponse({ status: 400, description: 'Loại request không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy request' })
  @Roles('manager', 'admin', 'hr')
  async approveRequest(
    @Param('type', RequestTypeValidationPipe) type: RequestType,
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') approverId: number,
  ) {
    return await this.requestsService.approveRequest(type, id, approverId);
  }

  @Patch(':type/:id/reject')
  @ApiOperation({ summary: 'Từ chối request (Manager/Admin only)' })
  @ApiParam({
    name: 'type',
    enum: RequestType,
    description: 'Loại request',
    example: RequestType.OVERTIME,
  })
  @ApiParam({
    name: 'id',
    description: 'ID của request',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  @ApiResponse({ status: 400, description: 'Loại request không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy request' })
  @Roles('manager', 'admin', 'hr')
  async rejectRequest(
    @Param('type', RequestTypeValidationPipe) type: RequestType,
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') rejectorId: number,
    @Body('reason') reason: string,
  ) {
    return await this.requestsService.rejectRequest(
      type,
      id,
      rejectorId,
      reason,
    );
  }
}
