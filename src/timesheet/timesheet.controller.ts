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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  DateRangeValidationPipe,
  DateValidationPipe,
} from '../common/pipes/date-validation.pipe';
import {
  AttendanceLogQueryDto,
  CreateAttendanceLogDto,
  UpdateAttendanceLogDto,
} from './dto/attendance-log.dto';
import { CheckinDto, CheckoutDto } from './dto/checkin-checkout.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import {
  DateRangeQueryDto,
  SingleDateQueryDto,
} from './dto/date-validation.dto';
import { GetScheduleDto } from './dto/get-schedule.dto';
import {
  AttendanceLogPaginationDto,
  HolidayPaginationDto,
  TimesheetPaginationDto,
} from './dto/pagination-queries.dto';
import { RegisterFaceDto } from './dto/register-face.dto';
import {
  TimesheetReportDto,
  WorkingTimeReportDto,
} from './dto/timesheet-report.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { TimesheetService } from './timesheet.service';

@ApiTags('Timesheet')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('timesheet')
export class TimesheetController {
  constructor(private readonly timesheetService: TimesheetService) {}

  // === TIMESHEET MANAGEMENT ===

  @Post()
  @RequirePermission('timesheet.create')
  @ApiOperation({ summary: 'Tạo timesheet mới' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  create(
    @Body() createTimesheetDto: CreateTimesheetDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return this.timesheetService.createTimesheet(createTimesheetDto, user_id);
  }

  @Get('my-timesheets')
  @RequirePermission('timesheet.read')
  @ApiOperation({
    summary:
      'Lấy danh sách timesheet của tôi có phân trang với requests trong ngày',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              user_id: { type: 'number' },
              work_date: { type: 'string', format: 'date' },
              checkin: { type: 'string', format: 'date-time' },
              checkout: { type: 'string', format: 'date-time' },
              status: { type: 'string' },
              requests: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    request_type: {
                      type: 'string',
                      enum: [
                        'remote_work',
                        'day_off',
                        'overtime',
                        'late_early',
                        'forgot_checkin',
                      ],
                    },
                    status: { type: 'string' },
                    reason: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                    approved_at: { type: 'string', format: 'date-time' },
                    approved_by: { type: 'number' },
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
            total_pages: { type: 'number' },
          },
        },
      },
    },
  })
  findMyTimesheets(
    @GetCurrentUser('id') user_id: number,
    @Query() paginationDto: TimesheetPaginationDto,
  ) {
    return this.timesheetService.findMyTimesheetsPaginated(
      user_id,
      paginationDto,
    );
  }

  @Patch(':id/submit')
  @RequirePermission('timesheet.update')
  @ApiOperation({ summary: 'Submit timesheet để chờ duyệt' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  submitTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
  ) {
    return this.timesheetService.submitTimesheet(id, user_id);
  }

  @Patch(':id/approve')
  @RequirePermission('timesheet.approve')
  @ApiOperation({ summary: 'Duyệt timesheet (Manager/HR only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  @Roles('manager', 'admin', 'hr')
  approveTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') approverId: number,
  ) {
    return this.timesheetService.approveTimesheet(id, approverId);
  }

  @Patch(':id/reject')
  @RequirePermission('timesheet.approve')
  @ApiOperation({ summary: 'Từ chối timesheet (Manager/HR only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  @Roles('manager', 'admin', 'hr')
  rejectTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') rejectorId: number,
    @Body('reason') reason?: string,
  ) {
    return this.timesheetService.rejectTimesheet(id, rejectorId, reason);
  }

  @Patch(':id/lock')
  @RequirePermission('timesheet.approve')
  @ApiOperation({ summary: 'Khóa timesheet sau tính lương (Admin only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  @Roles('admin', 'hr')
  lockTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') lockerId: number,
  ) {
    return this.timesheetService.lockTimesheet(id, lockerId);
  }

  @Patch(':id')
  @RequirePermission('timesheet.update')
  @ApiOperation({ summary: 'Cập nhật timesheet' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTimesheetDto: UpdateTimesheetDto,
  ) {
    return this.timesheetService.updateTimesheet(id, updateTimesheetDto);
  }

  @Delete(':id')
  @RequirePermission('timesheet.delete')
  @ApiOperation({ summary: 'Xóa timesheet' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.removeTimesheet(id);
  }

  // Face registeration for check-in/out

  @Post('register-face')
  @RequirePermission('user.profile.update')
  @ApiOperation({
    summary: 'Đăng ký khuôn mặt cho chấm công',
    description: `
      Endpoint này đăng ký khuôn mặt của user với Face ID Service.
      Luồng hoạt động:
      1. Frontend gọi /upload/presigned-url để lấy presigned URL
      2. Frontend upload ảnh lên Cloudinary
      3. Frontend gọi API này với user_id và photo_url từ Cloudinary
      4. Backend download ảnh từ Cloudinary và gửi đến Face ID Service
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Đăng ký khuôn mặt thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Đăng ký khuôn mặt thành công' },
        data: { type: 'object' },
        photo_url: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc URL ảnh không phải từ Cloudinary',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  registerFace(@Body() registerFaceDto: RegisterFaceDto) {
    return this.timesheetService.registerFace(
      registerFaceDto.user_id,
      registerFaceDto.photo_url,
    );
  }

  // === CHECK-IN/CHECK-OUT ===

  @Post('checkin')
  @RequirePermission('attendance.checkin')
  @ApiOperation({ summary: 'Check-in' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  async checkin(
    @GetCurrentUser('id') user_id: number,
    @Body() checkinDto: CheckinDto,
  ) {
    return this.timesheetService.checkin(user_id, checkinDto);
  }

  @Post('checkout')
  @RequirePermission('attendance.checkin')
  @ApiOperation({ summary: 'Check-out' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  checkout(
    @GetCurrentUser('id') user_id: number,
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.timesheetService.checkout(user_id, checkoutDto);
  }

  @Get('attendance/today')
  @RequirePermission('attendance.read')
  @ApiOperation({ summary: 'Lấy thông tin chấm công hôm nay' })
  @ApiResponse({ status: 200 })
  getTodayAttendance(@GetCurrentUser('id') user_id: number) {
    return this.timesheetService.getTodayAttendance(user_id);
  }

  // === DAY OFF INFO (Read-only) ===

  @Get('day-off-info/:date')
  @RequirePermission('leave.read')
  @ApiOperation({ summary: 'Lấy thông tin nghỉ phép của một ngày' })
  @ApiResponse({ status: 200 })
  getDayOffInfo(
    @GetCurrentUser('id') user_id: number,
    @Param('date', DateValidationPipe) date: string,
  ) {
    return this.timesheetService.getDayOffInfo(user_id, date);
  }

  // === OVERTIME INFO (Read-only) ===

  // === SCHEDULE MANAGEMENT ===

  @Get('schedule/personal')
  @RequirePermission('timesheet.read')
  @ApiOperation({ summary: 'Xem lịch làm việc cá nhân' })
  @ApiResponse({ status: 200 })
  getPersonalSchedule(
    @GetCurrentUser('id') user_id: number,
    @Query() getScheduleDto: GetScheduleDto,
  ) {
    return this.timesheetService.getPersonalSchedule(user_id, getScheduleDto);
  }

  @Get('schedule/team/:team_id')
  @RequirePermission('timesheet.read')
  @ApiOperation({ summary: 'Xem lịch làm việc của team' })
  @ApiResponse({ status: 200 })
  @Roles('manager', 'team_leader', 'admin')
  getTeamSchedule(
    @Param('team_id', ParseIntPipe) team_id: number,
    @Query() getScheduleDto: GetScheduleDto,
  ) {
    return this.timesheetService.getTeamSchedule(team_id, getScheduleDto);
  }

  // === HOLIDAYS MANAGEMENT ===

  @Post('holidays')
  @RequirePermission('holiday.create')
  @ApiOperation({ summary: 'Tạo ngày lễ mới' })
  @ApiResponse({ status: 201 })
  @Roles('admin', 'hr')
  createHoliday(@Body() createHolidayDto: CreateHolidayDto) {
    return this.timesheetService.createHoliday(createHolidayDto);
  }

  @Get('holidays')
  @RequirePermission('holiday.read')
  @ApiOperation({ summary: 'Lấy danh sách ngày lễ có phân trang' })
  @ApiResponse({ status: 200 })
  findAllHolidays(@Query() paginationDto: HolidayPaginationDto) {
    return this.timesheetService.findAllHolidaysPaginated(paginationDto);
  }

  @Patch('holidays/:id')
  @RequirePermission('holiday.update')
  @ApiOperation({ summary: 'Cập nhật ngày lễ' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @Roles('admin', 'hr')
  updateHoliday(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.timesheetService.updateHoliday(id, updateHolidayDto);
  }

  @Delete('holidays/:id')
  @RequirePermission('holiday.delete')
  @ApiOperation({ summary: 'Xóa ngày lễ' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @Roles('admin', 'hr')
  removeHoliday(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.removeHoliday(id);
  }

  // === NOTIFICATIONS ===

  @Get('notifications/my')
  @RequirePermission('notification.read')
  @ApiOperation({ summary: 'Lấy thông báo timesheet của tôi' })
  @ApiResponse({ status: 200 })
  getMyTimesheetNotifications(@GetCurrentUser('id') user_id: number) {
    return this.timesheetService.getTimesheetNotifications(user_id);
  }

  // === REPORTS & STATISTICS ===

  @Get('reports/timesheet')
  @RequirePermission('report.timesheet.view')
  @ApiOperation({ summary: 'Báo cáo timesheet' })
  @ApiResponse({ status: 200 })
  @Roles('manager', 'admin', 'hr')
  getTimesheetReport(@Query() reportDto: TimesheetReportDto) {
    return this.timesheetService.getTimesheetReport(reportDto);
  }

  @Get('reports/working-time')
  @RequirePermission('report.timesheet.view')
  @ApiOperation({ summary: 'Báo cáo giờ làm việc' })
  @ApiResponse({ status: 200 })
  @Roles('manager', 'admin', 'hr')
  getWorkingTimeReport(@Query() reportDto: WorkingTimeReportDto) {
    return this.timesheetService.getWorkingTimeReport(reportDto);
  }

  @Get('statistics/attendance')
  @RequirePermission('attendance.statistics')
  @ApiOperation({ summary: 'Thống kê chấm công' })
  @ApiResponse({ status: 200 })
  getAttendanceStatistics(
    @GetCurrentUser('id') currentuser_id: number,
    @Query(DateRangeValidationPipe) dateRange: DateRangeQueryDto,
    @Query('user_id', ParseIntPipe) user_id?: number,
  ) {
    // Nếu không phải admin/manager thì chỉ xem được thống kê của mình
    const targetuser_id = user_id || currentuser_id;
    return this.timesheetService.getAttendanceStatistics(
      targetuser_id,
      dateRange.start_date,
      dateRange.end_date,
    );
  }

  @Get('statistics/my-attendance')
  @RequirePermission('attendance.read')
  @ApiOperation({ summary: 'Thống kê chấm công cá nhân' })
  @ApiResponse({ status: 200 })
  getMyAttendanceStatistics(
    @GetCurrentUser('id') user_id: number,
    @Query(DateRangeValidationPipe) dateRange: DateRangeQueryDto,
  ) {
    return this.timesheetService.getAttendanceStatistics(
      user_id,
      dateRange.start_date,
      dateRange.end_date,
    );
  }

  // === ATTENDANCE LOGS MANAGEMENT ===

  @Post('attendance-logs')
  @RequirePermission('attendance.manage')
  @ApiOperation({ summary: 'Tạo log chấm công thủ công (Admin only)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403 })
  @Roles('admin', 'hr')
  createAttendanceLog(
    @Body() createAttendanceLogDto: CreateAttendanceLogDto,
    @GetCurrentUser('id') currentuser_id: number,
  ) {
    return this.timesheetService.createAttendanceLog(
      createAttendanceLogDto,
      currentuser_id,
    );
  }

  @Get('attendance-logs/my')
  @RequirePermission('attendance.read')
  @ApiOperation({ summary: 'Lấy danh sách logs chấm công của tôi' })
  @ApiResponse({ status: 200 })
  getMyAttendanceLogs(
    @GetCurrentUser('id') user_id: number,
    @Query() queryDto: AttendanceLogQueryDto,
  ) {
    return this.timesheetService.getAttendanceLogs(user_id, {
      ...queryDto,
      user_id: user_id,
    });
  }

  @Get('attendance-logs')
  @RequirePermission('attendance.read')
  @ApiOperation({ summary: 'Lấy danh sách logs chấm công có phân trang' })
  @ApiResponse({ status: 200 })
  getAttendanceLogs(
    @GetCurrentUser('id') currentuser_id: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() paginationDto: AttendanceLogPaginationDto,
  ) {
    return this.timesheetService.getAttendanceLogsPaginated(
      currentuser_id,
      paginationDto,
      userRoles,
    );
  }

  // Param route - after all named routes

  @Get(':id')
  @RequirePermission('timesheet.read')
  @ApiOperation({ summary: 'Lấy chi tiết timesheet' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.findTimesheetById(id);
  }

  @Get('attendance-logs/:id')
  @RequirePermission('attendance.read')
  @ApiOperation({ summary: 'Lấy chi tiết log chấm công' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  getAttendanceLogById(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.getAttendanceLogById(id);
  }

  @Patch('attendance-logs/:id')
  @RequirePermission('attendance.manage')
  @ApiOperation({ summary: 'Cập nhật log chấm công' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @Roles('admin', 'hr', 'manager')
  updateAttendanceLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAttendanceLogDto: UpdateAttendanceLogDto,
    @GetCurrentUser('id') currentuser_id: number,
  ) {
    updateAttendanceLogDto.user_id = currentuser_id;
    return this.timesheetService.updateAttendanceLog(
      id,
      updateAttendanceLogDto,
    );
  }

  @Delete('attendance-logs/:id')
  @RequirePermission('attendance.manage')
  @ApiOperation({ summary: 'Xóa log chấm công (Admin only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @Roles('admin')
  deleteAttendanceLog(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.deleteAttendanceLog(id);
  }

  // === DAILY TIMESHEET CREATION ===

  @Post('daily/create')
  @RequirePermission('timesheet.create')
  @ApiOperation({ summary: 'Tạo timesheet hàng ngày (tự động hoặc thủ công)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  createDailyTimesheet(
    @GetCurrentUser('id') user_id: number,
    @Body(DateRangeValidationPipe) body: SingleDateQueryDto,
  ) {
    return this.timesheetService.createDailyTimesheet(user_id, body.date);
  }
}
