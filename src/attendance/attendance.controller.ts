import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AttendanceService } from './attendance.service';
import {
  AttendanceDashboardDto,
  AttendanceReportDto,
} from './dto/dashboard.dto';

@ApiTags('attendance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
  ) {}

  // === LEAVE BALANCE MANAGEMENT ===

  @Get('leave-balance/:user_id/:year')
  @ApiOperation({ summary: 'Xem số dư phép năm của nhân viên' })
  @ApiParam({
    name: 'user_id',
    description: 'ID người dùng',
    type: 'integer',
    example: 1,
  })
  @ApiParam({
    name: 'year',
    description: 'Năm cần xem (YYYY)',
    type: 'integer',
    example: 2024,
  })
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
        used_sick_leave: 1,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Tham số đầu vào không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy người dùng' })
  getLeaveBalance(
    @Param(
      'user_id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () =>
          new Error('ID người dùng phải là số nguyên dương'),
      }),
    )
    user_id: number,
    @Param(
      'year',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () => new Error('Năm phải là số nguyên hợp lệ'),
      }),
    )
    year: number,
  ) {
    return this.attendanceService.getLeaveBalance(user_id, year);
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

}

