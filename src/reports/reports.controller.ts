import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermission,
} from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { PermissionService } from '../auth/services/permission.service';
import {
  AttendanceDashboardQueryDto,
  AttendanceStatisticsDto,
  TimesheetReportQueryDto,
  WorkingTimeReportQueryDto,
} from './dto/attendance-statistics.dto';
import {
  MonthlyWorkSummaryDetailQueryDto,
  MonthlyWorkSummaryDetailResponseDto,
  MonthlyWorkSummaryExportQueryDto,
  MonthlyWorkSummaryQueryDto,
  MonthlyWorkSummaryResponseDto,
} from './dto/monthly-work-summary.dto';
import { ReportsService } from './reports.service';
import { MonthlyWorkSummaryExportService } from './services/monthly-work-summary-export.service';
import { MonthlyWorkSummaryService } from './services/monthly-work-summary.service';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly monthlyWorkSummaryService: MonthlyWorkSummaryService,
    private readonly monthlyWorkSummaryExportService: MonthlyWorkSummaryExportService,
    private readonly permissionService: PermissionService,
  ) {}

  // === TIMESHEET REPORTS ===

  @Get('timesheet')
  @RequireAnyPermission(['report.timesheet.view', 'report.read'])
  @ApiOperation({
    summary:
      'Báo cáo timesheet theo khoảng thời gian (hỗ trợ report_type: summary/detailed/penalty)',
  })
  async getTimesheetReport(
    @Query() query: TimesheetReportQueryDto,
    @Query('report_type') reportType?: 'summary' | 'detailed' | 'penalty',
  ) {
    return this.reportsService.getTimesheetReport(query, reportType);
  }

  @Get('working-time')
  @RequireAnyPermission(['report.timesheet.view', 'report.read'])
  @ApiOperation({ summary: 'Báo cáo thời gian làm việc theo tháng/năm' })
  async getWorkingTimeReport(@Query() query: WorkingTimeReportQueryDto) {
    return this.reportsService.getWorkingTimeReport(query);
  }

  @Get('attendance-statistics')
  @RequireAnyPermission([
    'report.attendance.statistics',
    'report.attendance.view',
    'report.read',
  ])
  @ApiOperation({ summary: 'Thống kê chấm công chi tiết' })
  async getAttendanceStatistics(@Query() query: AttendanceStatisticsDto) {
    return this.reportsService.getAttendanceStatistics(query);
  }

  // === ATTENDANCE REPORTS ===

  @Get('attendance-dashboard')
  @RequireAnyPermission([
    'report.attendance.dashboard',
    'report.attendance.view',
    'report.read',
  ])
  @ApiOperation({ summary: 'Dashboard chấm công với thống kê tổng quan' })
  async getAttendanceDashboard(@Query() query: AttendanceDashboardQueryDto) {
    return this.reportsService.getAttendanceDashboard(query);
  }

  /**
   * DEPRECATED: API này trùng với GET /timesheet, nên sử dụng các API sau thay thế:
   * - GET /attendance-dashboard - Dashboard tổng quan
   * - GET /attendance-statistics - Thống kê chi tiết
   * - GET /attendance/summary - Tổng hợp chấm công
   */
  @Get('attendance')
  @RequireAnyPermission(['report.attendance.view', 'report.read'])
  @ApiOperation({
    summary:
      'Tạo báo cáo chấm công chi tiết (summary/detailed/penalty) - DEPRECATED, dùng /timesheet thay thế',
  })
  async generateAttendanceReport(
    @Query() query: TimesheetReportQueryDto,
    @Query('report_type') reportType?: 'summary' | 'detailed' | 'penalty',
  ) {
    return this.reportsService.getTimesheetReport(query, reportType);
  }

  // === ADDITIONAL REPORTS ===

  @Get('attendance/summary')
  @RequireAnyPermission(['report.attendance.view', 'report.read'])
  @ApiOperation({ summary: 'Báo cáo tổng hợp chấm công' })
  async getAttendanceSummary(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('division_id') division_id?: number,
  ) {
    return this.reportsService.getAttendanceSummary(
      startDate,
      endDate,
      division_id,
    );
  }

  @Get('attendance/late-statistics')
  @RequireAnyPermission([
    'report.attendance.statistics',
    'report.attendance.view',
    'report.read',
  ])
  @ApiOperation({ summary: 'Thống kê đi muộn về sớm' })
  async getLateStatistics(
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.reportsService.getLateStatistics(month, year);
  }

  @Get('leave/summary')
  @RequireAnyPermission([
    'report.leave.summary',
    'report.leave.view',
    'report.read',
  ])
  @ApiOperation({ summary: 'Báo cáo tổng hợp nghỉ phép' })
  async getLeaveSummary(
    @Query('year') year?: number,
    @Query('division_id') division_id?: number,
  ) {
    return this.reportsService.getLeaveSummary(year, division_id);
  }

  @Get('overtime/summary')
  @RequireAnyPermission([
    'report.overtime.summary',
    'report.overtime.view',
    'report.read',
  ])
  @ApiOperation({ summary: 'Báo cáo tổng hợp tăng ca' })
  async getOvertimeSummary(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('division_id') division_id?: number,
  ) {
    return this.reportsService.getOvertimeSummary(
      startDate,
      endDate,
      division_id,
    );
  }

  @Get('personnel-transfer/summary')
  @RequireAnyPermission([
    'report.transfer.summary',
    'report.transfer.view',
    'report.read',
  ])
  @ApiOperation({ summary: 'Báo cáo tổng hợp điều chuyển nhân sự' })
  async getPersonnelTransferSummary(
    @Query('year') year?: number,
    @Query('division_id') division_id?: number,
  ) {
    return this.reportsService.getPersonnelTransferSummary(year, division_id);
  }

  @Get('dashboard/comprehensive')
  @RequireAnyPermission(['report.dashboard.comprehensive', 'report.read'])
  @ApiOperation({ summary: 'Dashboard tổng hợp tất cả báo cáo' })
  async getComprehensiveDashboard(
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.reportsService.getComprehensiveDashboard(month, year);
  }

  // === MONTHLY WORK SUMMARY REPORTS ===

  @Get('monthly-work-summary')
  @RequireAnyPermission([
    'reports.monthly-work-summary.view-all',
    'reports.monthly-work-summary.view-team',
    'reports.monthly-work-summary.view-own',
  ])
  @ApiOperation({
    summary: 'Lấy báo cáo công tháng - Danh sách nhân viên',
    description: `
      API này trả về danh sách báo cáo công tháng của các nhân viên với đầy đủ thống kê:
      
      **Chức năng:**
      - Xem tổng số ngày đi làm, nghỉ phép, đi muộn/về sớm
      - Tính toán số công làm việc (1 ngày = 2 buổi)
      - Tỷ lệ đi làm, tỷ lệ đúng giờ
      - Chi tiết các buổi nghỉ phép
      
      **Quyền truy cập:**
      - HR/Admin: Xem tất cả nhân viên
      - Manager/Team Lead: Xem nhân viên trong team/division quản lý
      - Employee: Chỉ xem của bản thân
      
      **Filter:**
      - Theo tháng (bắt buộc)
      - Theo phòng ban, team
      - Tìm kiếm theo tên/email
      - Phân trang và sắp xếp
      
      **Ứng dụng:**
      - Tính lương cuối tháng
      - Đánh giá hiệu suất làm việc
      - Quản lý nhân sự
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy báo cáo thành công',
    type: MonthlyWorkSummaryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tham số không hợp lệ (ví dụ: định dạng tháng sai)',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập báo cáo này',
  })
  async getMonthlyWorkSummary(
    @Query() query: MonthlyWorkSummaryQueryDto,
    @GetCurrentUser('id') currentUserId: number,
  ): Promise<MonthlyWorkSummaryResponseDto> {
    // Get user permissions from their roles
    const permissions =
      await this.permissionService.getUserPermissions(currentUserId);

    return this.monthlyWorkSummaryService.getMonthlyWorkSummary(
      query,
      currentUserId,
      permissions,
    );
  }

  @Get('monthly-work-summary/export')
  @RequirePermission('reports.monthly-work-summary.export')
  @ApiOperation({
    summary: 'Export báo cáo công tháng ra file Excel hoặc CSV',
    description: `
      API này xuất báo cáo công tháng ra file để tải về, hỗ trợ 2 định dạng:
      
      **Định dạng Excel (.xlsx):**
      - Sheet 1: Báo cáo tổng hợp
        + Header: Logo công ty, tên báo cáo, tháng/năm
        + Bảng dữ liệu với đầy đủ cột: Mã NV, Tên, Phòng ban, Số công, Nghỉ phép, v.v.
        + Footer: Thống kê tổng hợp
      - Sheet 2: Chi tiết vi phạm (danh sách đi muộn/về sớm)
      - Sheet 3: Chi tiết nghỉ phép
      - Sheet 4: Chi tiết tăng ca
      - Format: Màu sắc, border, auto-width, freeze panes
      
      **Định dạng CSV (.csv):**
      - File CSV đơn giản với UTF-8 encoding
      - Có BOM để Excel hiển thị đúng tiếng Việt
      - Header tiếng Việt
      
      **Parameters:**
      - month: Tháng báo cáo (bắt buộc)
      - format: 'excel' hoặc 'csv' (mặc định: excel)
      - division_id, team_id: Filter theo phòng ban/team
      - page, limit: Phân trang (giới hạn số bản ghi export)
      
      **Quyền:** Cần permission 'reports.monthly-work-summary.export'
      
      **File tải về:**
      - Excel: Bao_cao_cong_thang_YYYY_MM.xlsx
      - CSV: Bao_cao_cong_thang_YYYY_MM.csv
    `,
  })
  @ApiQuery({
    name: 'month',
    description: 'Tháng báo cáo (YYYY-MM)',
    example: '2025-11',
    required: true,
  })
  @ApiQuery({
    name: 'format',
    enum: ['excel', 'csv'],
    description: 'Định dạng file export',
    example: 'excel',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Export thành công, file được tải về',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền export báo cáo',
  })
  async exportMonthlyWorkSummary(
    @Query() query: MonthlyWorkSummaryExportQueryDto,
    @GetCurrentUser('id') currentUserId: number,
    @Res() res: Response,
  ) {
    // Get user permissions from their roles
    const permissions =
      await this.permissionService.getUserPermissions(currentUserId);

    // Get data
    const data = await this.monthlyWorkSummaryService.getMonthlyWorkSummary(
      query,
      currentUserId,
      permissions,
    );

    const format = query.format || 'excel';
    const filename = `Bao_cao_cong_thang_${query.month.replace('-', '_')}.${format === 'excel' ? 'xlsx' : 'csv'}`;

    if (format === 'excel') {
      try {
        const buffer =
          await this.monthlyWorkSummaryExportService.exportListToExcel(data);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`,
        );
        return res.send(buffer);
      } catch (error) {
        // If exceljs not installed, fallback to error message
        return res.status(501).json({
          message:
            'Excel export requires exceljs library. Please install it first: npm install exceljs',
          error: error.message,
        });
      }
    } else {
      // CSV export
      const csvContent =
        this.monthlyWorkSummaryExportService.exportListToCSV(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      // Add BOM for Excel UTF-8 support
      return res.send('\ufeff' + csvContent);
    }
  }

  @Get('monthly-work-summary/:user_id')
  @RequireAnyPermission([
    'reports.monthly-work-summary.view-all',
    'reports.monthly-work-summary.view-team',
    'reports.monthly-work-summary.view-own',
  ])
  @ApiOperation({
    summary: 'Lấy báo cáo công tháng chi tiết của một nhân viên',
    description: `
      API này trả về báo cáo công tháng chi tiết của một nhân viên cụ thể, bao gồm:
      
      **Thông tin tổng hợp:**
      - Tổng số ngày đi làm, nghỉ phép
      - Số công làm việc
      - Tỷ lệ đi làm, đúng giờ
      - Số giờ tăng ca
      
      **Chi tiết từng ngày:**
      - Thời gian check-in/check-out
      - Số phút đi muộn/về sớm
      - Trạng thái: đi làm, nghỉ phép, ngày lễ, cuối tuần
      - Số công trong ngày (buổi sáng + buổi chiều)
      
      **Chi tiết vi phạm:**
      - Ngày vi phạm
      - Số phút đi muộn/về sớm
      - Có đơn xin phép được duyệt không
      
      **Chi tiết nghỉ phép:**
      - Danh sách các đơn nghỉ
      - Loại nghỉ, trạng thái
      - Người duyệt và thời gian duyệt
      
      **Chi tiết tăng ca:**
      - Danh sách các đơn tăng ca
      - Số giờ tăng ca
      - Trạng thái duyệt
      
      **Ứng dụng:**
      - Xem chi tiết công của nhân viên để tính lương
      - Kiểm tra vi phạm và đơn nghỉ phép
      - Đánh giá chi tiết hiệu suất làm việc
    `,
  })
  @ApiParam({
    name: 'user_id',
    description: 'ID của nhân viên cần xem báo cáo',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy báo cáo chi tiết thành công',
    type: MonthlyWorkSummaryDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy nhân viên',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem báo cáo của nhân viên này',
  })
  async getMonthlyWorkSummaryDetail(
    @Param('user_id', ParseIntPipe) userId: number,
    @Query() query: MonthlyWorkSummaryDetailQueryDto,
    @GetCurrentUser('id') currentUserId: number,
  ): Promise<MonthlyWorkSummaryDetailResponseDto> {
    // Get user permissions from their roles
    const permissions =
      await this.permissionService.getUserPermissions(currentUserId);

    // SECURITY FIX: Strengthened permission check
    const hasViewAll = permissions.includes(
      'reports.monthly-work-summary.view-all',
    );
    const hasViewTeam = permissions.includes(
      'reports.monthly-work-summary.view-team',
    );
    const hasViewOwn = permissions.includes(
      'reports.monthly-work-summary.view-own',
    );

    // DEBUG: Log for troubleshooting
    this.logger.debug(
      `[getMonthlyWorkSummaryDetail] User ${currentUserId} accessing userId ${userId}`,
      {
        hasViewAll,
        hasViewTeam,
        hasViewOwn,
      },
    );

    // SECURITY: If user has ONLY view-own permission, must be viewing self
    if (!hasViewAll && !hasViewTeam && hasViewOwn) {
      if (userId !== currentUserId) {
        this.logger.warn(
          `[SECURITY] User ${currentUserId} tried to access userId ${userId} with view-own permission only`,
        );
        throw new ForbiddenException(
          'Bạn chỉ có quyền xem báo cáo của bản thân',
        );
      }
    }

    // SECURITY: If user has no permissions at all, deny
    if (!hasViewAll && !hasViewTeam && !hasViewOwn) {
      this.logger.warn(
        `[SECURITY] User ${currentUserId} has no report permissions`,
      );
      throw new ForbiddenException('Bạn không có quyền xem báo cáo này');
    }


    return this.monthlyWorkSummaryService.getMonthlyWorkSummaryDetail(
      userId,
      query,
    );
  }
}
