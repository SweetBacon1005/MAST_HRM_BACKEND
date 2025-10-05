import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttendanceService } from './attendance.service';
import {
  AttendanceCalculationDto,
  PenaltyCalculationDto,
  WorkShiftDto,
} from './dto/attendance-calculation.dto';
import {
  AttendanceDashboardDto,
  AttendanceReportDto,
  PenaltyReportDto,
} from './dto/dashboard.dto';
import {
  CreateLeaveRequestDto,
  RemoteWorkRequestDto,
} from './dto/leave-management.dto';
import {
  WorkShiftPaginationDto,
  PenaltyRulePaginationDto,
} from './dto/pagination-queries.dto';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../common/dto/error-response.dto';

@ApiTags('attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true, 
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
}))
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // === TÍNH TOÁN CHẤM CÔNG CHI TIẾT ===

  @Post('calculate')
  @ApiOperation({
    summary: 'Tính toán chấm công chi tiết với thời gian và phạt',
    description: 'API này tính toán chi tiết thời gian làm việc, phạt đi muộn/về sớm dựa trên thời gian check-in/out'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Tính toán chấm công thành công',
    schema: {
      example: {
        id: 1,
        checkin: '2024-01-15T08:00:00Z',
        checkout: '2024-01-15T17:30:00Z',
        late_time: 0,
        early_time: 0,
        work_time_morning: 240,
        work_time_afternoon: 240,
        fines: 0,
        remote: 'OFFICE'
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Dữ liệu đầu vào không hợp lệ',
    type: ValidationErrorResponseDto
  })
  @ApiNotFoundResponse({ 
    description: 'Không tìm thấy người dùng hoặc ca làm việc',
    type: ErrorResponseDto
  })
  @ApiUnprocessableEntityResponse({ 
    description: 'Không thể xử lý yêu cầu - thời gian không hợp lệ',
    type: ErrorResponseDto
  })
  calculateAttendance(
    @Body() attendanceDto: AttendanceCalculationDto, 
    @GetCurrentUser('id') userId: number
  ) {
    // Gán user_id từ token để đảm bảo security
    attendanceDto.user_id = userId;
    return this.attendanceService.calculateAttendance(attendanceDto);
  }

  @Post('calculate-penalty')
  @ApiOperation({ summary: 'Tính toán phạt đi muộn, về sớm' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Tính toán phạt thành công',
    schema: {
      example: {
        late_penalty: 50000,
        early_penalty: 25000,
        total_penalty: 75000,
        late_blocks: 2,
        early_blocks: 1,
        block_time_used: {
          id: 1,
          block: 1,
          minutes: 15,
          money: 25000
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Dữ liệu đầu vào không hợp lệ',
    type: ValidationErrorResponseDto
  })
  @ApiNotFoundResponse({ 
    description: 'Không tìm thấy quy định phạt',
    type: ErrorResponseDto
  })
  calculatePenalty(@Body() penaltyDto: PenaltyCalculationDto) {
    return this.attendanceService.calculatePenalties(penaltyDto);
  }

  // === QUẢN LÝ CA LÀM VIỆC ===

  @Post('work-shifts')
  @ApiOperation({ summary: 'Tạo ca làm việc mới' })
  @ApiResponse({ status: 201, description: 'Tạo ca làm việc thành công' })
  @Roles('admin', 'hr', 'manager')
  createWorkShift(@Body() workShiftDto: WorkShiftDto) {
    return this.attendanceService.createWorkShift(workShiftDto);
  }

  @Get('work-shifts')
  @ApiOperation({ summary: 'Lấy danh sách tất cả ca làm việc' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getAllWorkShifts() {
    return this.attendanceService.getAllWorkShifts();
  }

  @Get('work-shifts/paginated')
  @ApiOperation({ summary: 'Lấy danh sách ca làm việc có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getAllWorkShiftsPaginated(@Query() paginationDto: WorkShiftPaginationDto) {
    return this.attendanceService.getAllWorkShiftsPaginated(paginationDto);
  }

  @Patch('work-shifts/:id')
  @ApiOperation({ summary: 'Cập nhật ca làm việc' })
  @ApiParam({ name: 'id', description: 'ID ca làm việc', type: 'integer', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật ca làm việc thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy ca làm việc' })
  @ApiBadRequestResponse({ description: 'Dữ liệu cập nhật không hợp lệ' })
  @ApiForbiddenResponse({ description: 'Không có quyền cập nhật ca làm việc' })
  @Roles('admin', 'hr', 'manager')
  updateWorkShift(
    @Param('id', new ParseIntPipe({ 
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      exceptionFactory: () => new Error('ID ca làm việc phải là số nguyên dương')
    })) id: number,
    @Body() workShiftDto: Partial<WorkShiftDto>,
  ) {
    return this.attendanceService.updateWorkShift(id, workShiftDto);
  }

  // === QUẢN LÝ NGHỈ PHÉP NÂNG CAO ===

  @Post('leave-requests')
  @ApiOperation({ summary: 'Tạo đơn xin nghỉ phép chi tiết' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Tạo đơn nghỉ phép thành công',
    schema: {
      example: {
        id: 1,
        user_id: 1,
        total: 3,
        status: 'PENDING',
        type: 'PAID',
        start_date: '2024-01-15',
        end_date: '2024-01-17',
        is_past: false
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Dữ liệu đầu vào không hợp lệ hoặc số ngày phép không đủ',
    type: ValidationErrorResponseDto
  })
  @ApiConflictResponse({
    description: 'Đã có đơn nghỉ phép trùng thời gian',
    type: ErrorResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy người dùng',
    type: ErrorResponseDto
  })
  createLeaveRequest(@Body() leaveRequestDto: CreateLeaveRequestDto) {
    return this.attendanceService.createLeaveRequest(leaveRequestDto);
  }

  @Post('remote-work-requests')
  @ApiOperation({ summary: 'Tạo yêu cầu làm việc từ xa' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Tạo yêu cầu làm việc từ xa thành công',
    schema: {
      example: {
        id: 1,
        user_id: 1,
        checkin: '2024-01-15T08:00:00Z',
        checkout: '2024-01-15T17:30:00Z',
        remote: 'REMOTE',
        status: 'PENDING',
        work_time_morning: 240,
        work_time_afternoon: 240
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Dữ liệu đầu vào không hợp lệ',
    type: ValidationErrorResponseDto
  })
  @ApiConflictResponse({ 
    description: 'Đã có yêu cầu làm việc từ xa cho ngày này',
    type: ErrorResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy người dùng',
    type: ErrorResponseDto
  })
  createRemoteWorkRequest(@Body() remoteWorkDto: RemoteWorkRequestDto) {
    return this.attendanceService.createRemoteWorkRequest(remoteWorkDto);
  }

  @Get('leave-balance/:userId/:year')
  @ApiOperation({ summary: 'Xem số dư phép năm của nhân viên' })
  @ApiParam({ name: 'userId', description: 'ID người dùng', type: 'integer', example: 1 })
  @ApiParam({ name: 'year', description: 'Năm cần xem (YYYY)', type: 'integer', example: 2024 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lấy số dư phép thành công',
    schema: {
      example: {
        user_id: 1,
        year: 2024,
        total_annual_leave: 12,
        used_annual_leave: 5,
        remaining_annual_leave: 7,
        compensatory_leave: 2,
        used_sick_leave: 1
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Tham số đầu vào không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng' })
  getLeaveBalance(
    @Param('userId', new ParseIntPipe({ 
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      exceptionFactory: () => new Error('ID người dùng phải là số nguyên dương')
    })) userId: number,
    @Param('year', new ParseIntPipe({ 
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      exceptionFactory: () => new Error('Năm phải là số nguyên hợp lệ')
    })) year: number,
  ) {
    return this.attendanceService.getLeaveBalance(userId, year);
  }

  @Get('my-leave-balance')
  @ApiOperation({ summary: 'Xem số dư phép năm của tôi' })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Năm cần xem (mặc định năm hiện tại)',
    type: 'integer',
    example: 2024
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lấy số dư phép cá nhân thành công' 
  })
  @ApiBadRequestResponse({ description: 'Tham số năm không hợp lệ' })
  getMyLeaveBalance(
    @GetCurrentUser('id') userId: number,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), new ParseIntPipe({ 
      optional: true,
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      exceptionFactory: () => new Error('Năm phải là số nguyên hợp lệ')
    })) year?: number,
  ) {
    const targetYear = year || new Date().getFullYear();
    return this.attendanceService.getLeaveBalance(userId, targetYear);
  }

  // === DASHBOARD CHẤM CÔNG ===

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard chấm công với thống kê tổng quan' })
  @ApiResponse({ status: 200, description: 'Lấy dashboard thành công' })
  @Roles('manager', 'admin', 'hr')
  getAttendanceDashboard(@Query() dashboardDto: AttendanceDashboardDto) {
    return this.attendanceService.getAttendanceDashboard(dashboardDto);
  }

  @Get('dashboard/my-team')
  @ApiOperation({ summary: 'Dashboard chấm công team của tôi' })
  @ApiResponse({ status: 200, description: 'Lấy dashboard team thành công' })
  @Roles('team_leader', 'manager')
  getMyTeamDashboard(
    @GetCurrentUser('id') userId: number,
    @Query() dashboardDto: AttendanceDashboardDto,
  ) {
    // Lấy team_id từ thông tin user (cần implement logic lấy team)
    // Tạm thời return dashboard chung
    return this.attendanceService.getAttendanceDashboard(dashboardDto);
  }

  // === BÁO CÁO CHI TIẾT ===

  @Get('reports/attendance')
  @ApiOperation({ summary: 'Báo cáo chấm công chi tiết' })
  @ApiResponse({ status: 200, description: 'Tạo báo cáo thành công' })
  @Roles('manager', 'admin', 'hr')
  generateAttendanceReport(@Query() reportDto: AttendanceReportDto) {
    return this.attendanceService.generateAttendanceReport(reportDto);
  }

  @Get('reports/penalties')
  @ApiOperation({ summary: 'Báo cáo phạt vi phạm chấm công' })
  @ApiResponse({ status: 200, description: 'Tạo báo cáo phạt thành công' })
  @Roles('manager', 'admin', 'hr')
  generatePenaltyReport(@Query() _penaltyReportDto: PenaltyReportDto) {
    // Tạo AttendanceReportDto cho penalty report
    const reportDto: AttendanceReportDto = {
      report_type: 'penalty',
    };

    return this.attendanceService.generateAttendanceReport(reportDto);
  }

  @Get('reports/my-attendance')
  @ApiOperation({ summary: 'Báo cáo chấm công cá nhân' })
  @ApiResponse({ status: 200, description: 'Lấy báo cáo cá nhân thành công' })
  getMyAttendanceReport(
    @GetCurrentUser('id') userId: number,
    @Query() reportDto: AttendanceReportDto,
  ) {
    const personalReportDto: AttendanceReportDto = {
      ...reportDto,
      user_ids: [userId],
    };

    return this.attendanceService.generateAttendanceReport(personalReportDto);
  }

  // === THỐNG KÊ NÂNG CAO ===

  @Get('statistics/violations')
  @ApiOperation({ summary: 'Thống kê vi phạm chấm công' })
  @ApiResponse({ status: 200, description: 'Lấy thống kê vi phạm thành công' })
  @Roles('manager', 'admin', 'hr')
  getViolationStatistics(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('division_id', ParseIntPipe) divisionId?: number,
    @Query('team_id', ParseIntPipe) teamId?: number,
  ) {
    const dashboardDto: AttendanceDashboardDto = {
      start_date: startDate,
      end_date: endDate,
      division_id: divisionId,
      team_id: teamId,
    };

    return this.attendanceService.getAttendanceDashboard(dashboardDto);
  }

  @Get('statistics/work-patterns')
  @ApiOperation({ summary: 'Thống kê mô hình làm việc (onsite/remote)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê mô hình làm việc thành công',
  })
  @Roles('manager', 'admin', 'hr')
  getWorkPatternStatistics(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('user_ids') userIds?: string, // comma-separated string
  ) {
    const parsedUserIds = userIds
      ? userIds.split(',').map((id) => parseInt(id))
      : undefined;

    const reportDto: AttendanceReportDto = {
      report_type: 'summary',
      user_ids: parsedUserIds,
    };

    return this.attendanceService.generateAttendanceReport(reportDto);
  }

  @Get('statistics/productivity')
  @ApiOperation({ summary: 'Thống kê hiệu suất làm việc' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê hiệu suất thành công',
  })
  @Roles('manager', 'admin', 'hr')
  getProductivityStatistics(
    @Query('period_type') periodType?: string,
    @Query('division_id', ParseIntPipe) divisionId?: number,
  ) {
    const dashboardDto: AttendanceDashboardDto = {
      period_type: periodType || 'monthly',
      division_id: divisionId,
    };

    return this.attendanceService.getAttendanceDashboard(dashboardDto);
  }

  // === QUẢN LÝ QUY ĐỊNH PHẠT ===

  @Get('penalty-rules')
  @ApiOperation({ summary: 'Lấy danh sách quy định phạt' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getPenaltyRules() {
    // Lấy từ bảng block_times
    const blockTimes = await this.attendanceService[
      'prisma'
    ].block_times.findMany({
      where: { deleted_at: null },
      orderBy: { block: 'asc' },
    });

    return blockTimes;
  }

  @Get('penalty-rules/paginated')
  @ApiOperation({ summary: 'Lấy danh sách quy định phạt có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getPenaltyRulesPaginated(
    @Query() paginationDto: PenaltyRulePaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = { deleted_at: null };

    // Thêm filter theo block
    if (paginationDto.block) {
      where.block = paginationDto.block;
    }

    // Thêm filter theo min_minutes
    if (paginationDto.min_minutes) {
      where.minutes = {
        gte: paginationDto.min_minutes,
      };
    }

    // Lấy dữ liệu và đếm tổng
    const [data, total] = await Promise.all([
      this.attendanceService['prisma'].block_times.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { block: 'asc' },
      }),
      this.attendanceService['prisma'].block_times.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  @Post('penalty-rules')
  @ApiOperation({ summary: 'Tạo quy định phạt mới' })
  @ApiResponse({ status: 201, description: 'Tạo quy định thành công' })
  @Roles('admin', 'hr')
  async createPenaltyRule(
    @Body()
    penaltyRule: {
      block: number;
      minutes: number;
      money: number;
      time_late_early: number;
      next_time_late_early: number;
    },
  ) {
    return this.attendanceService['prisma'].block_times.create({
      data: penaltyRule,
    });
  }

  @Patch('penalty-rules/:id')
  @ApiOperation({ summary: 'Cập nhật quy định phạt' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @Roles('admin', 'hr')
  async updatePenaltyRule(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    penaltyRule: Partial<{
      block: number;
      minutes: number;
      money: number;
      time_late_early: number;
      next_time_late_early: number;
    }>,
  ) {
    return this.attendanceService['prisma'].block_times.update({
      where: { id },
      data: penaltyRule,
    });
  }

  @Delete('penalty-rules/:id')
  @ApiOperation({ summary: 'Xóa quy định phạt' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @Roles('admin', 'hr')
  async deletePenaltyRule(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService['prisma'].block_times.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
