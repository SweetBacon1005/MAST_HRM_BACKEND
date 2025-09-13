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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
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

@ApiTags('Attendance Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // === TÍNH TOÁN CHẤM CÔNG CHI TIẾT ===

  @Post('calculate')
  @ApiOperation({
    summary: 'Tính toán chấm công chi tiết với thời gian và phạt',
  })
  @ApiResponse({ status: 201, description: 'Tính toán thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  calculateAttendance(@Body() attendanceDto: AttendanceCalculationDto) {
    return this.attendanceService.calculateAttendance(attendanceDto);
  }

  @Post('calculate-penalty')
  @ApiOperation({ summary: 'Tính toán phạt đi muộn, về sớm' })
  @ApiResponse({ status: 200, description: 'Tính toán phạt thành công' })
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

  @Patch('work-shifts/:id')
  @ApiOperation({ summary: 'Cập nhật ca làm việc' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ca làm việc' })
  @Roles('admin', 'hr', 'manager')
  updateWorkShift(
    @Param('id', ParseIntPipe) id: number,
    @Body() workShiftDto: Partial<WorkShiftDto>,
  ) {
    return this.attendanceService.updateWorkShift(id, workShiftDto);
  }

  // === QUẢN LÝ NGHỈ PHÉP NÂNG CAO ===

  @Post('leave-requests')
  @ApiOperation({ summary: 'Tạo đơn xin nghỉ phép chi tiết' })
  @ApiResponse({ status: 201, description: 'Tạo đơn thành công' })
  @ApiResponse({
    status: 400,
    description: 'Số ngày phép không đủ hoặc trùng lịch',
  })
  createLeaveRequest(@Body() leaveRequestDto: CreateLeaveRequestDto) {
    return this.attendanceService.createLeaveRequest(leaveRequestDto);
  }

  @Post('remote-work-requests')
  @ApiOperation({ summary: 'Tạo yêu cầu làm việc từ xa' })
  @ApiResponse({ status: 201, description: 'Tạo yêu cầu thành công' })
  @ApiResponse({ status: 400, description: 'Đã có yêu cầu cho ngày này' })
  createRemoteWorkRequest(@Body() remoteWorkDto: RemoteWorkRequestDto) {
    return this.attendanceService.createRemoteWorkRequest(remoteWorkDto);
  }

  @Get('leave-balance/:userId/:year')
  @ApiOperation({ summary: 'Xem số dư phép năm của nhân viên' })
  @ApiResponse({ status: 200, description: 'Lấy số dư thành công' })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Năm (mặc định năm hiện tại)',
  })
  getLeaveBalance(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.attendanceService.getLeaveBalance(userId, year);
  }

  @Get('my-leave-balance')
  @ApiOperation({ summary: 'Xem số dư phép năm của tôi' })
  @ApiResponse({ status: 200, description: 'Lấy số dư thành công' })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Năm (mặc định năm hiện tại)',
  })
  getMyLeaveBalance(
    @GetCurrentUser('id') userId: number,
    @Query('year', ParseIntPipe) year?: number,
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
  generatePenaltyReport(@Query() penaltyReportDto: PenaltyReportDto) {
    const { start_date, end_date, min_penalty_amount, violation_type } =
      penaltyReportDto;

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
