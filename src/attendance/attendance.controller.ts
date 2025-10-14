import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnprocessableEntityResponse
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../common/dto/error-response.dto';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
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
// Leave and remote work request DTOs moved to /requests module
import {
  PenaltyRulePaginationDto,
  WorkShiftPaginationDto,
} from './dto/pagination-queries.dto';

@ApiTags('attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
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
  @RequirePermission('attendance.read')
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
  @RequirePermission('attendance.read')
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
  @ApiOperation({ summary: 'Lấy danh sách ca làm việc có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getAllWorkShifts(@Query() paginationDto: WorkShiftPaginationDto) {
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

  // === LEAVE BALANCE MANAGEMENT ===
  // Note: Leave requests and remote work requests moved to /requests module

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

  // === QUẢN LÝ QUY ĐỊNH PHẠT ===

  @Get('penalty-rules')
  @ApiOperation({ summary: 'Lấy danh sách quy định phạt có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getPenaltyRules(
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
