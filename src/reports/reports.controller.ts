import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import {
  AttendanceStatisticsDto,
  WorkingTimeReportQueryDto,
  TimesheetReportQueryDto,
  AttendanceReportQueryDto,
  AttendanceDashboardQueryDto,
} from './dto/attendance-statistics.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // === TIMESHEET REPORTS ===

  @Get('timesheet')
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
  @ApiOperation({ summary: 'Báo cáo thời gian làm việc theo tháng/năm' })
  async getWorkingTimeReport(@Query() query: WorkingTimeReportQueryDto) {
    return this.reportsService.getWorkingTimeReport(query);
  }

  @Get('attendance-statistics')
  @ApiOperation({ summary: 'Thống kê chấm công chi tiết' })
  async getAttendanceStatistics(@Query() query: AttendanceStatisticsDto) {
    return this.reportsService.getAttendanceStatistics(query);
  }

  // === ATTENDANCE REPORTS ===

  @Get('attendance-dashboard')
  @ApiOperation({ summary: 'Dashboard chấm công với thống kê tổng quan' })
  async getAttendanceDashboard(@Query() query: AttendanceDashboardQueryDto) {
    return this.reportsService.getAttendanceDashboard(query);
  }

  @Get('attendance')
  @ApiOperation({
    summary: 'Tạo báo cáo chấm công chi tiết (summary/detailed/penalty)',
  })
  async generateAttendanceReport(
    @Query() query: TimesheetReportQueryDto,
    @Query('report_type') reportType?: 'summary' | 'detailed' | 'penalty',
  ) {
    return this.reportsService.getTimesheetReport(query, reportType);
  }

  // === ADDITIONAL REPORTS ===

  @Get('attendance/summary')
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
  @ApiOperation({ summary: 'Thống kê đi muộn về sớm' })
  async getLateStatistics(
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.reportsService.getLateStatistics(month, year);
  }

  @Get('leave/summary')
  @ApiOperation({ summary: 'Báo cáo tổng hợp nghỉ phép' })
  async getLeaveSummary(
    @Query('year') year?: number,
    @Query('division_id') division_id?: number,
  ) {
    return this.reportsService.getLeaveSummary(year, division_id);
  }

  @Get('overtime/summary')
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
  @ApiOperation({ summary: 'Báo cáo tổng hợp điều chuyển nhân sự' })
  async getPersonnelTransferSummary(
    @Query('year') year?: number,
    @Query('division_id') division_id?: number,
  ) {
    return this.reportsService.getPersonnelTransferSummary(year, division_id);
  }

  @Get('dashboard/comprehensive')
  @ApiOperation({ summary: 'Dashboard tổng hợp tất cả báo cáo' })
  async getComprehensiveDashboard(
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.reportsService.getComprehensiveDashboard(month, year);
  }
}

