import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Header,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../common/dto/error-response.dto';
import { AttendanceService } from './attendance.service';
import {
  AttendanceCalculationDto,
  WorkShiftDto,
} from './dto/attendance-calculation.dto';
import {
  AttendanceDashboardDto,
  AttendanceReportDto,
  PenaltyReportDto,
} from './dto/dashboard.dto';
import { AttendanceExportService } from './services/attendance-export.service';
// Leave and remote work request DTOs moved to /requests module
import { WorkShiftPaginationDto } from './dto/pagination-queries.dto';

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
    private readonly exportService: AttendanceExportService,
  ) {}

  // === TÍNH TOÁN CHẤM CÔNG CHI TIẾT ===

  @Post('calculate')
  @RequirePermission('attendance.read')
  @ApiOperation({
    summary: 'Tính toán chấm công chi tiết với thời gian và phạt',
    description:
      'API này tính toán chi tiết thời gian làm việc, phạt đi muộn/về sớm dựa trên thời gian check-in/out',
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
        remote: 'OFFICE',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Dữ liệu đầu vào không hợp lệ',
    type: ValidationErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy người dùng hoặc ca làm việc',
    type: ErrorResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Không thể xử lý yêu cầu - thời gian không hợp lệ',
    type: ErrorResponseDto,
  })
  calculateAttendance(
    @Body() attendanceDto: AttendanceCalculationDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    // Gán user_id từ token để đảm bảo security
    attendanceDto.user_id = user_id;
    return this.attendanceService.calculateAttendance(attendanceDto);
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
  @ApiParam({
    name: 'id',
    description: 'ID ca làm việc',
    type: 'integer',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cập nhật ca làm việc thành công',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy ca làm việc' })
  @ApiBadRequestResponse({ description: 'Dữ liệu cập nhật không hợp lệ' })
  @ApiForbiddenResponse({ description: 'Không có quyền cập nhật ca làm việc' })
  @Roles('admin', 'hr', 'manager')
  updateWorkShift(
    @Param(
      'id',
      new ParseIntPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () =>
          new Error('ID ca làm việc phải là số nguyên dương'),
      }),
    )
    id: number,
    @Body() workShiftDto: Partial<WorkShiftDto>,
  ) {
    return this.attendanceService.updateWorkShift(id, workShiftDto);
  }

  // === LEAVE BALANCE MANAGEMENT ===
  // Note: Leave requests and remote work requests moved to /requests module

  @Get('my-leave-balance')
  @ApiOperation({ summary: 'Xem số dư phép năm của tôi' })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Năm cần xem (mặc định năm hiện tại)',
    type: 'integer',
    example: 2024,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy số dư phép cá nhân thành công',
  })
  @ApiBadRequestResponse({ description: 'Tham số năm không hợp lệ' })
  getMyLeaveBalance(
    @GetCurrentUser('id') user_id: number,
    @Query(
      'year',
      new DefaultValuePipe(new Date().getFullYear()),
      new ParseIntPipe({
        optional: true,
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: () => new Error('Năm phải là số nguyên hợp lệ'),
      }),
    )
    year?: number,
  ) {
    const targetYear = year || new Date().getFullYear();
    return this.attendanceService.getLeaveBalance(user_id, targetYear);
  }

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
    @GetCurrentUser('id') user_id: number,
    @Query() reportDto: AttendanceReportDto,
  ) {
    const personalReportDto: AttendanceReportDto = {
      ...reportDto,
      user_ids: [user_id],
    };

    return this.attendanceService.generateAttendanceReport(personalReportDto);
  }

  // === EXPORT CSV ===

  @Get('export/attendance-logs')
  @RequirePermission('report.read')
  @ApiOperation({ summary: 'Export danh sách chấm công ra CSV' })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Ngày kết thúc (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'division_id',
    required: false,
    description: 'ID phòng ban',
  })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="attendance-logs.csv"')
  async exportAttendanceLogs(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('division_id') division_id?: number,
    @Res() res?: Response,
  ) {
    const csv = await this.exportService.exportAttendanceLogs(
      startDate,
      endDate,
      division_id,
    );

    if (res) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="attendance-logs.csv"',
      );
      // Add BOM for Excel UTF-8 support
      res.send('\ufeff' + csv);
    }

    return csv;
  }

  @Get('export/leave-requests')
  @RequirePermission('report.read')
  @ApiOperation({ summary: 'Export danh sách nghỉ phép ra CSV' })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Ngày kết thúc (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'division_id',
    required: false,
    description: 'ID phòng ban',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Trạng thái' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="leave-requests.csv"')
  async exportLeaveRequests(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('division_id') division_id?: number,
    @Query('status') status?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportService.exportLeaveRequests(
      startDate,
      endDate,
      division_id,
      status,
    );

    if (res) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="leave-requests.csv"',
      );
      res.send('\ufeff' + csv);
    }

    return csv;
  }

  @Get('export/overtime-records')
  @RequirePermission('report.read')
  @ApiOperation({ summary: 'Export danh sách tăng ca ra CSV' })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Ngày kết thúc (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'division_id',
    required: false,
    description: 'ID phòng ban',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Trạng thái' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="overtime-records.csv"')
  async exportOvertimeRecords(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('division_id') division_id?: number,
    @Query('status') status?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportService.exportOvertimeRecords(
      startDate,
      endDate,
      division_id,
      status,
    );

    if (res) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="overtime-records.csv"',
      );
      res.send('\ufeff' + csv);
    }

    return csv;
  }

  @Get('export/late-early-requests')
  @RequirePermission('report.read')
  @ApiOperation({ summary: 'Export danh sách đi muộn/về sớm ra CSV' })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Ngày kết thúc (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'division_id',
    required: false,
    description: 'ID phòng ban',
  })
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="late-early-requests.csv"',
  )
  async exportLateEarlyRequests(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('division_id') division_id?: number,
    @Res() res?: Response,
  ) {
    const csv = await this.exportService.exportLateEarlyRequests(
      startDate,
      endDate,
      division_id,
    );

    if (res) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="late-early-requests.csv"',
      );
      res.send('\ufeff' + csv);
    }

    return csv;
  }

  @Get('export/remote-work-requests')
  @RequirePermission('report.read')
  @ApiOperation({ summary: 'Export danh sách làm việc từ xa ra CSV' })
  @ApiQuery({
    name: 'start_date',
    required: false,
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    description: 'Ngày kết thúc (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'division_id',
    required: false,
    description: 'ID phòng ban',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Trạng thái' })
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="remote-work-requests.csv"',
  )
  async exportRemoteWorkRequests(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('division_id') division_id?: number,
    @Query('status') status?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.exportService.exportRemoteWorkRequests(
      startDate,
      endDate,
      division_id,
      status,
    );

    if (res) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="remote-work-requests.csv"',
      );
      res.send('\ufeff' + csv);
    }

    return csv;
  }
}
