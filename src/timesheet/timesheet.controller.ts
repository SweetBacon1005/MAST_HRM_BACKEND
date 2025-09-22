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
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DateRangeValidationPipe,
  DateValidationPipe,
  WorkDateValidationPipe,
} from '../common/pipes/date-validation.pipe';
import {
  AttendanceLogQueryDto,
  CreateAttendanceLogDto,
  UpdateAttendanceLogDto,
} from './dto/attendance-log.dto';
import { CheckinDto, CheckoutDto } from './dto/checkin-checkout.dto';
import { CreateDayOffRequestDto } from './dto/create-day-off-request.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { CreateOvertimeRequestDto } from './dto/create-overtime-request.dto';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import {
  BulkLockTimesheetsDto,
  DateRangeQueryDto,
  SingleDateQueryDto,
} from './dto/date-validation.dto';
import { GetScheduleDto } from './dto/get-schedule.dto';
import {
  AttendanceLogPaginationDto,
  DayOffRequestPaginationDto,
  HolidayPaginationDto,
  OvertimeRequestPaginationDto,
  TimesheetPaginationDto,
} from './dto/pagination-queries.dto';
import {
  TimesheetReportDto,
  WorkingTimeReportDto,
} from './dto/timesheet-report.dto';
import { UpdateDayOffStatusDto } from './dto/update-day-off-status.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { UpdateTimesheetDto } from './dto/update-timesheet.dto';
import { TimesheetService } from './timesheet.service';

@ApiTags('Timesheet')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('timesheet')
export class TimesheetController {
  constructor(private readonly timesheetService: TimesheetService) {}

  // === TIMESHEET MANAGEMENT ===

  @Post()
  @ApiOperation({ summary: 'Tạo timesheet mới' })
  @ApiResponse({ status: 201, description: 'Tạo timesheet thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(
    @Body() createTimesheetDto: CreateTimesheetDto,
    @GetCurrentUser('id') userId: number,
  ) {
    return this.timesheetService.createTimesheet(createTimesheetDto, userId);
  }

  @Get('my-timesheets')
  @ApiOperation({ summary: 'Lấy danh sách timesheet của tôi' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findMyTimesheets(
    @GetCurrentUser('id') userId: number,
    @Query(DateRangeValidationPipe) dateRange: DateRangeQueryDto,
  ) {
    return this.timesheetService.findAllTimesheets(
      userId,
      dateRange.start_date,
      dateRange.end_date,
    );
  }

  @Get('my-timesheets/paginated')
  @ApiOperation({ summary: 'Lấy danh sách timesheet của tôi có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findMyTimesheetsPaginated(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: TimesheetPaginationDto,
  ) {
    return this.timesheetService.findMyTimesheetsPaginated(
      userId,
      paginationDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết timesheet' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy timesheet' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.findTimesheetById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật timesheet' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy timesheet' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTimesheetDto: UpdateTimesheetDto,
  ) {
    return this.timesheetService.updateTimesheet(id, updateTimesheetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa timesheet' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy timesheet' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.removeTimesheet(id);
  }

  // === CHECK-IN/CHECK-OUT ===

  @Post('checkin')
  @ApiOperation({ summary: 'Check-in' })
  @ApiResponse({ status: 201, description: 'Check-in thành công' })
  @ApiResponse({ status: 400, description: 'Đã check-in hôm nay rồi' })
  checkin(
    @GetCurrentUser('id') userId: number,
    @Body() checkinDto: CheckinDto,
  ) {
    return this.timesheetService.checkin(userId, checkinDto);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Check-out' })
  @ApiResponse({ status: 200, description: 'Check-out thành công' })
  @ApiResponse({ status: 400, description: 'Chưa check-in hoặc đã check-out' })
  checkout(
    @GetCurrentUser('id') userId: number,
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.timesheetService.checkout(userId, checkoutDto);
  }

  @Get('attendance/today')
  @ApiOperation({ summary: 'Lấy thông tin chấm công hôm nay' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  getTodayAttendance(@GetCurrentUser('id') userId: number) {
    return this.timesheetService.getTodayAttendance(userId);
  }

  // === DAY OFF REQUESTS ===

  @Post('day-off-requests')
  @ApiOperation({ summary: 'Tạo đơn xin nghỉ phép' })
  @ApiResponse({ status: 201, description: 'Tạo đơn thành công' })
  createDayOffRequest(
    @Body() createDayOffRequestDto: CreateDayOffRequestDto,
    @GetCurrentUser('id') userId: number,
  ) {
    createDayOffRequestDto.user_id = userId;
    return this.timesheetService.createDayOffRequest(createDayOffRequestDto);
  }

  @Get('day-off-requests/my')
  @ApiOperation({ summary: 'Lấy danh sách đơn nghỉ phép của tôi' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findMyDayOffRequests(@GetCurrentUser('id') userId: number) {
    return this.timesheetService.findAllDayOffRequests(userId);
  }

  @Get('day-off-requests/my/paginated')
  @ApiOperation({
    summary: 'Lấy danh sách đơn nghỉ phép của tôi có phân trang',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findMyDayOffRequestsPaginated(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: DayOffRequestPaginationDto,
  ) {
    return this.timesheetService.findMyDayOffRequestsPaginated(
      userId,
      paginationDto,
    );
  }

  @Patch('day-off-requests/:id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái đơn nghỉ phép (Duyệt/Từ chối)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn nghỉ phép' })
  @Roles('manager', 'admin')
  updateDayOffRequestStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateDayOffStatusDto,
    @GetCurrentUser('id') approverId: number,
  ) {
    return this.timesheetService.updateDayOffRequestStatus(
      id,
      updateStatusDto.status,
      approverId,
      updateStatusDto.rejected_reason,
    );
  }

  @Get('day-off-info/:date')
  @ApiOperation({ summary: 'Lấy thông tin nghỉ phép của một ngày' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  getDayOffInfo(
    @GetCurrentUser('id') userId: number,
    @Param('date', DateValidationPipe) date: string,
  ) {
    return this.timesheetService.getDayOffInfo(userId, date);
  }

  // === OVERTIME REQUESTS ===

  @Post('overtime-requests')
  @ApiOperation({ summary: 'Tạo đơn xin làm thêm giờ' })
  @ApiResponse({ status: 201, description: 'Tạo đơn thành công' })
  createOvertimeRequest(
    @Body() createOvertimeRequestDto: CreateOvertimeRequestDto,
    @GetCurrentUser('id') userId: number,
  ) {
    createOvertimeRequestDto.user_id = userId;
    return this.timesheetService.createOvertimeRequest(
      createOvertimeRequestDto,
    );
  }

  @Get('overtime-requests/my')
  @ApiOperation({ summary: 'Lấy danh sách đơn làm thêm giờ của tôi' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findMyOvertimeRequests(@GetCurrentUser('id') userId: number) {
    return this.timesheetService.findAllOvertimeRequests(userId);
  }

  @Get('overtime-requests/my/paginated')
  @ApiOperation({
    summary: 'Lấy danh sách đơn làm thêm giờ của tôi có phân trang',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findMyOvertimeRequestsPaginated(
    @GetCurrentUser('id') userId: number,
    @Query() paginationDto: OvertimeRequestPaginationDto,
  ) {
    return this.timesheetService.findMyOvertimeRequestsPaginated(
      userId,
      paginationDto,
    );
  }

  // === SCHEDULE MANAGEMENT ===

  @Get('schedule/personal')
  @ApiOperation({ summary: 'Xem lịch làm việc cá nhân' })
  @ApiResponse({ status: 200, description: 'Lấy lịch thành công' })
  getPersonalSchedule(
    @GetCurrentUser('id') userId: number,
    @Query() getScheduleDto: GetScheduleDto,
  ) {
    return this.timesheetService.getPersonalSchedule(userId, getScheduleDto);
  }

  @Get('schedule/team/:teamId')
  @ApiOperation({ summary: 'Xem lịch làm việc của team' })
  @ApiResponse({ status: 200, description: 'Lấy lịch team thành công' })
  @Roles('manager', 'team_leader', 'admin')
  getTeamSchedule(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query() getScheduleDto: GetScheduleDto,
  ) {
    return this.timesheetService.getTeamSchedule(teamId, getScheduleDto);
  }

  // === HOLIDAYS MANAGEMENT ===

  @Post('holidays')
  @ApiOperation({ summary: 'Tạo ngày lễ mới' })
  @ApiResponse({ status: 201, description: 'Tạo ngày lễ thành công' })
  @Roles('admin', 'hr')
  createHoliday(@Body() createHolidayDto: CreateHolidayDto) {
    return this.timesheetService.createHoliday(createHolidayDto);
  }

  @Get('holidays')
  @ApiOperation({ summary: 'Lấy danh sách ngày lễ theo năm' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAllHolidays(@Param('year') year: string) {
    console.log(year);
    return this.timesheetService.findAllHolidays(year);
  }

  @Get('holidays/paginated')
  @ApiOperation({ summary: 'Lấy danh sách ngày lễ có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAllHolidaysPaginated(@Query() paginationDto: HolidayPaginationDto) {
    return this.timesheetService.findAllHolidaysPaginated(paginationDto);
  }

  @Patch('holidays/:id')
  @ApiOperation({ summary: 'Cập nhật ngày lễ' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ngày lễ' })
  @Roles('admin', 'hr')
  updateHoliday(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.timesheetService.updateHoliday(id, updateHolidayDto);
  }

  @Delete('holidays/:id')
  @ApiOperation({ summary: 'Xóa ngày lễ' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy ngày lễ' })
  @Roles('admin', 'hr')
  removeHoliday(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.removeHoliday(id);
  }

  // === NOTIFICATIONS ===

  @Get('notifications/my')
  @ApiOperation({ summary: 'Lấy thông báo timesheet của tôi' })
  @ApiResponse({ status: 200, description: 'Lấy thông báo thành công' })
  getMyTimesheetNotifications(@GetCurrentUser('id') userId: number) {
    return this.timesheetService.getTimesheetNotifications(userId);
  }

  // === REPORTS & STATISTICS ===

  @Get('reports/timesheet')
  @ApiOperation({ summary: 'Báo cáo timesheet' })
  @ApiResponse({ status: 200, description: 'Lấy báo cáo thành công' })
  @Roles('manager', 'admin', 'hr')
  getTimesheetReport(@Query() reportDto: TimesheetReportDto) {
    return this.timesheetService.getTimesheetReport(reportDto);
  }

  @Get('reports/working-time')
  @ApiOperation({ summary: 'Báo cáo giờ làm việc' })
  @ApiResponse({ status: 200, description: 'Lấy báo cáo thành công' })
  @Roles('manager', 'admin', 'hr')
  getWorkingTimeReport(@Query() reportDto: WorkingTimeReportDto) {
    return this.timesheetService.getWorkingTimeReport(reportDto);
  }

  @Get('statistics/attendance')
  @ApiOperation({ summary: 'Thống kê chấm công' })
  @ApiResponse({ status: 200, description: 'Lấy thống kê thành công' })
  getAttendanceStatistics(
    @GetCurrentUser('id') currentUserId: number,
    @Query(DateRangeValidationPipe) dateRange: DateRangeQueryDto,
    @Query('user_id', ParseIntPipe) userId?: number,
  ) {
    // Nếu không phải admin/manager thì chỉ xem được thống kê của mình
    const targetUserId = userId || currentUserId;
    return this.timesheetService.getAttendanceStatistics(
      targetUserId,
      dateRange.start_date,
      dateRange.end_date,
    );
  }

  @Get('statistics/my-attendance')
  @ApiOperation({ summary: 'Thống kê chấm công cá nhân' })
  @ApiResponse({ status: 200, description: 'Lấy thống kê thành công' })
  getMyAttendanceStatistics(
    @GetCurrentUser('id') userId: number,
    @Query(DateRangeValidationPipe) dateRange: DateRangeQueryDto,
  ) {
    return this.timesheetService.getAttendanceStatistics(
      userId,
      dateRange.start_date,
      dateRange.end_date,
    );
  }

  // === ATTENDANCE LOGS MANAGEMENT ===

  @Post('attendance-logs')
  @ApiOperation({ summary: 'Tạo log chấm công thủ công (Admin only)' })
  @ApiResponse({ status: 201, description: 'Tạo log thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @Roles('admin', 'hr')
  createAttendanceLog(
    @Body() createAttendanceLogDto: CreateAttendanceLogDto,
    @GetCurrentUser('id') currentUserId: number,
  ) {
    return this.timesheetService.createAttendanceLog(
      createAttendanceLogDto,
      currentUserId,
    );
  }

  @Get('attendance-logs')
  @ApiOperation({ summary: 'Lấy danh sách logs chấm công' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getAttendanceLogs(
    @GetCurrentUser('id') currentUserId: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() queryDto: AttendanceLogQueryDto,
  ) {
    return this.timesheetService.getAttendanceLogs(
      currentUserId,
      queryDto,
      userRoles,
    );
  }

  @Get('attendance-logs/paginated')
  @ApiOperation({ summary: 'Lấy danh sách logs chấm công có phân trang' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getAttendanceLogsPaginated(
    @GetCurrentUser('id') currentUserId: number,
    @GetCurrentUser('roles') userRoles: string[],
    @Query() paginationDto: AttendanceLogPaginationDto,
  ) {
    return this.timesheetService.getAttendanceLogsPaginated(
      currentUserId,
      paginationDto,
      userRoles,
    );
  }

  @Get('attendance-logs/my')
  @ApiOperation({ summary: 'Lấy danh sách logs chấm công của tôi' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getMyAttendanceLogs(
    @GetCurrentUser('id') userId: number,
    @Query() queryDto: AttendanceLogQueryDto,
  ) {
    return this.timesheetService.getAttendanceLogs(userId, {
      ...queryDto,
      user_id: userId,
    });
  }

  @Get('attendance-logs/:id')
  @ApiOperation({ summary: 'Lấy chi tiết log chấm công' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy log' })
  getAttendanceLogById(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.getAttendanceLogById(id);
  }

  @Patch('attendance-logs/:id')
  @ApiOperation({ summary: 'Cập nhật log chấm công' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy log' })
  @Roles('admin', 'hr', 'manager')
  updateAttendanceLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAttendanceLogDto: UpdateAttendanceLogDto,
    @GetCurrentUser('id') currentUserId: number,
  ) {
    return this.timesheetService.updateAttendanceLog(
      id,
      updateAttendanceLogDto,
      currentUserId,
    );
  }

  @Delete('attendance-logs/:id')
  @ApiOperation({ summary: 'Xóa log chấm công (Admin only)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy log' })
  @Roles('admin')
  deleteAttendanceLog(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.deleteAttendanceLog(id);
  }

  // === DAILY TIMESHEET CREATION ===

  @Post('daily/create')
  @ApiOperation({ summary: 'Tạo timesheet hàng ngày (tự động hoặc thủ công)' })
  @ApiResponse({ status: 201, description: 'Tạo timesheet thành công' })
  @ApiResponse({ status: 400, description: 'Timesheet đã tồn tại' })
  createDailyTimesheet(
    @GetCurrentUser('id') userId: number,
    @Body(DateRangeValidationPipe) body: SingleDateQueryDto,
  ) {
    return this.timesheetService.createDailyTimesheet(userId, body.date);
  }

  @Post('daily/bulk-create')
  @ApiOperation({ summary: 'Tạo timesheet hàng loạt (Admin only)' })
  @ApiResponse({ status: 201, description: 'Tạo timesheet thành công' })
  @Roles('admin', 'hr')
  createBulkDailyTimesheets(
    @Body('work_date', WorkDateValidationPipe) workDate: string,
    @Body('user_ids') userIds?: number[],
  ) {
    return this.timesheetService.createBulkDailyTimesheets(workDate, userIds);
  }

  @Post('cronjob/auto-create-daily')
  @ApiOperation({ summary: 'Tạo timesheet tự động hàng ngày (Cronjob only)' })
  @ApiResponse({ status: 201, description: 'Tạo timesheet tự động thành công' })
  @ApiResponse({ status: 400, description: 'Lỗi khi tạo timesheet' })
  @Public() // Không cần auth cho cronjob
  autoDailyTimesheetCreation(
    @Body(DateRangeValidationPipe) body: SingleDateQueryDto,
  ) {
    return this.timesheetService.autoDailyTimesheetCreation(body.date);
  }

  // === TIMESHEET STATE MANAGEMENT ===

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit timesheet để chờ duyệt' })
  @ApiResponse({ status: 200, description: 'Submit thành công' })
  @ApiResponse({ status: 400, description: 'Không thể submit' })
  submitTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') userId: number,
  ) {
    return this.timesheetService.submitTimesheet(id, userId);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Duyệt timesheet (Manager/HR only)' })
  @ApiResponse({ status: 200, description: 'Duyệt thành công' })
  @ApiResponse({ status: 400, description: 'Không thể duyệt' })
  @Roles('manager', 'admin', 'hr')
  approveTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') approverId: number,
  ) {
    return this.timesheetService.approveTimesheet(id, approverId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Từ chối timesheet (Manager/HR only)' })
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  @ApiResponse({ status: 400, description: 'Không thể từ chối' })
  @Roles('manager', 'admin', 'hr')
  rejectTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') rejectorId: number,
    @Body('reason') reason?: string,
  ) {
    return this.timesheetService.rejectTimesheet(id, rejectorId, reason);
  }

  @Patch(':id/lock')
  @ApiOperation({ summary: 'Khóa timesheet sau tính lương (Admin only)' })
  @ApiResponse({ status: 200, description: 'Khóa thành công' })
  @ApiResponse({ status: 400, description: 'Không thể khóa' })
  @Roles('admin', 'hr')
  lockTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') lockerId: number,
  ) {
    return this.timesheetService.lockTimesheet(id, lockerId);
  }

  @Post('bulk-lock')
  @ApiOperation({
    summary: 'Khóa hàng loạt timesheet theo kỳ lương (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Khóa thành công' })
  @Roles('admin', 'hr')
  bulkLockTimesheets(
    @Body(DateRangeValidationPipe) body: BulkLockTimesheetsDto,
  ) {
    return this.timesheetService.bulkLockTimesheets(
      body.start_date,
      body.end_date,
      body.user_ids,
    );
  }
}
