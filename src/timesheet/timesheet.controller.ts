import {
  BadRequestException,
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
import { GetAuthContext } from '../auth/decorators/get-auth-context.decorator';
import type { AuthorizationContext } from '../auth/services/authorization-context.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { ScopeType } from '@prisma/client';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import {
  DateRangeValidationPipe,
  DateValidationPipe,
} from '../common/pipes/date-validation.pipe';
import {
  AttendanceLogQueryDto,
  CreateAttendanceLogDto,
  UpdateAttendanceLogDto,
} from './dto/attendance-log.dto';
import { AttendanceStatisticsQueryDto } from './dto/attendance-statistics-query.dto';
import {
  BulkReviewTimesheetDto,
  TimesheetForApprovalQueryDto,
} from './dto/bulk-timesheet-action.dto';
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
  @ApiOperation({
    summary: 'Tạo timesheet mới',
    description: `
      Tạo timesheet thủ công (dùng cho admin/HR hoặc trường hợp đặc biệt).
      
      **Logic tự động:**
      - Kiểm tra user đã có timesheet cho work_date chưa
      - Kiểm tra có approved day_off không
      - **Tự động detect type = HOLIDAY** nếu work_date là ngày lễ
      - Nếu không truyền type hoặc type = NORMAL → auto-check holidays
      - Nếu truyền type = OVERTIME → giữ nguyên OVERTIME
      
      **Holiday detection:**
      - Check work_date có nằm trong khoảng [start_date, end_date] của holiday ACTIVE không
      - Nếu có → Set type = HOLIDAY
      - Nếu không → Set type = NORMAL (hoặc giữ type đã truyền)
      
      **Use cases:**
      - Admin tạo timesheet cho user quên check-in
      - HR điều chỉnh timesheet
      - Import timesheet từ hệ thống cũ
    `,
  })
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



  // === BULK APPROVE/REJECT TIMESHEETS ===

  @Get('list-for-approval')
  @RequirePermission('timesheet.approve')
  @ApiOperation({
    summary: 'Lấy danh sách timesheets cần duyệt (hr_manager, admin only)',
    description: `
      API này cho phép hr_manager và admin xem danh sách timesheets cần duyệt.
      
      **Filters:**
      - user_id: Lọc theo user cụ thể
      - month: Lọc theo tháng (YYYY-MM)
      - division_id: Lọc theo phòng ban
      - team_id: Lọc theo team
      - status: Lọc theo trạng thái (mặc định PENDING)
      
      **Phân trang:**
      - page: Số trang (mặc định 1)
      - limit: Số bản ghi/trang (mặc định 20)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
    schema: {
      example: {
        data: [
          {
            id: 1,
            user_id: 5,
            work_date: '2024-01-15',
            checkin: '2024-01-15T08:00:00Z',
            checkout: '2024-01-15T17:30:00Z',
            status: 'PENDING',
            user: {
              id: 5,
              email: 'user@example.com',
              user_information: {
                name: 'Nguyễn Văn A',
                avatar: 'https://...',
              },
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          total_pages: 3,
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  getTimesheetsForApproval(@Query() queryDto: TimesheetForApprovalQueryDto) {
    return this.timesheetService.getTimesheetsForApproval(queryDto);
  }

  @Post('bulk-review')
  @RequirePermission('timesheet.approve')
  @ApiOperation({
    summary: 'Review hàng loạt timesheets (hr_manager, admin only)',
    description: `
      API này cho phép hr_manager và admin duyệt hoặc từ chối nhiều timesheets cùng lúc.
      
      **Action:**
      - APPROVE: Duyệt timesheets
      - REJECT: Từ chối timesheets (bắt buộc có reason)
      
      **Lưu ý:**
      - Tất cả timesheets phải ở trạng thái PENDING
      - Khi action = REJECT, reason là bắt buộc
      - Nếu có timesheet không hợp lệ, toàn bộ request sẽ bị reject
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Review thành công',
    schema: {
      examples: {
        approve: {
          summary: 'Approve example',
          value: {
            success: true,
            action: 'APPROVE',
            message: 'Đã duyệt 5 timesheets thành công',
            approved_count: 5,
            approved_ids: [1, 2, 3, 4, 5],
            reviewer_id: 10,
          },
        },
        reject: {
          summary: 'Reject example',
          value: {
            success: true,
            action: 'REJECT',
            message: 'Đã từ chối 3 timesheets thành công',
            rejected_count: 3,
            rejected_ids: [1, 2, 3],
            reviewer_id: 10,
            reason: 'Thiếu thông tin check-out',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc trạng thái timesheet không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Một số timesheet không tồn tại',
  })
  bulkReviewTimesheets(
    @Body() bulkReviewDto: BulkReviewTimesheetDto,
    @GetCurrentUser('id') reviewer_id: number,
  ) {
    return this.timesheetService.bulkReviewTimesheets(
      bulkReviewDto.timesheet_ids,
      bulkReviewDto.action,
      reviewer_id,
      bulkReviewDto.reason,
    );
  }

  @Delete(':id')
  @RequirePermission('timesheet.delete')
  @ApiOperation({ summary: 'Xóa timesheet' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.timesheetService.removeTimesheet(id);
  }

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
  @ApiOperation({
    summary: 'Check-in',
    description: `
      Check-in cho ngày làm việc hiện tại.
      
      **Logic tự động:**
      - Kiểm tra IP có hợp lệ không (nếu bật IP validation)
      - Tạo timesheet nếu chưa có cho ngày hôm nay
      - **Tự động detect type = HOLIDAY** nếu hôm nay là ngày lễ
      - Type = NORMAL nếu không phải holiday
      - Tạo attendance log với action_type = 'checkin'
      - Tạo attendance session mới (is_open = true)
      
      **Lưu ý:**
      - Nếu đã check-in rồi → Error: "Bạn đã check-in hôm nay rồi"
      - Nếu có session đang mở → Error: "Vui lòng check-out trước khi check-in lại"
      - Holiday detection dựa vào bảng holidays (status = ACTIVE)
    `,
  })
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
  @ApiOperation({
    summary: 'Báo cáo timesheet',
    description: `
      Báo cáo timesheet theo khoảng thời gian, division hoặc team.
      
      **Response bao gồm:**
      - timesheets: Danh sách timesheets trong kỳ
      - stats: Thống kê tổng hợp (late, early leave, incomplete, remote, average work hours)
      - period: Khoảng thời gian báo cáo
      - holidays: Danh sách ngày lễ trong kỳ (ACTIVE holidays)
      
      **Lưu ý:**
      - Holidays được trả về để hiển thị trên calendar/timeline
      - Stats không bao gồm ngày holidays
    `,
  })
  @ApiResponse({ status: 200 })
  getTimesheetReport(@Query() reportDto: TimesheetReportDto) {
    return this.timesheetService.getTimesheetReport(reportDto);
  }

  @Get('reports/working-time')
  @RequirePermission('report.timesheet.view')
  @ApiOperation({
    summary: 'Báo cáo giờ làm việc',
    description: `
      Báo cáo chi tiết giờ làm việc theo user và tháng.
      
      **Response bao gồm:**
      - period: Tháng/năm báo cáo
      - user_stats: Thống kê từng user (total_days, work_hours, late, early, remote)
      - summary: Tổng hợp toàn bộ (total_users, total_working_days, average_work_hours)
      
      **QUAN TRỌNG - Logic tính toán:**
      - working_days_in_month: ĐÃ TRỪ weekends và holidays
      - expected_work_days: working_days_in_month - full_day_offs
      - attendance_rate: completeDays / expectedWorkDays * 100%
      
      **Lưu ý về holidays:**
      - Holidays KHÔNG tính vào expected work days
      - Logic calculateWorkingDaysInMonth đã loại trừ holidays
    `,
  })
  @ApiResponse({ status: 200 })
  getWorkingTimeReport(@Query() reportDto: WorkingTimeReportDto) {
    return this.timesheetService.getWorkingTimeReport(reportDto);
  }

  @Get('statistics/attendance')
  @RequirePermission('attendance.statistics')
  @ApiOperation({
    summary: 'Thống kê chấm công',
    description: `
      Thống kê chi tiết chấm công của user trong khoảng thời gian.
      
      **Phân quyền:**
      - hr_manager, admin: 
        + Không truyền user_id → Xem thống kê TẤT CẢ users
        + Truyền user_id → Xem thống kê user cụ thể
      - Các role khác: Chỉ được xem thống kê của chính mình
      
      **Response (1 user):**
      - period, total_work_days, overtime_hours, late_minutes
      - attendance: Chi tiết attendance
      - summary: attendance_rate, punctuality_rate
      
      **Response (tất cả users - hr_manager/admin):**
      - period: Khoảng thời gian
      - summary: Tổng hợp toàn bộ (total_employees, average_attendance_rate...)
      - employees: Danh sách thống kê từng nhân viên
      - holidays: Danh sách ngày lễ
    `,
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Không có quyền xem thống kê của user khác' })
  getAttendanceStatistics(
    @GetCurrentUser('id') currentuser_id: number,
    @GetAuthContext() authContext: AuthorizationContext,
    @Query() queryDto: AttendanceStatisticsQueryDto,
  ) {
    // Check HR Manager hoặc Admin ở COMPANY scope
    const isHrOrAdmin =
      authContext.hasRole(ROLE_NAMES.HR_MANAGER, ScopeType.COMPANY) ||
      authContext.hasRole(ROLE_NAMES.ADMIN, ScopeType.COMPANY);

    if (queryDto.user_id) {
      if (queryDto.user_id !== currentuser_id && !isHrOrAdmin) {
        throw new BadRequestException(
          'Bạn không có quyền xem thống kê chấm công của user khác',
        );
      }
      
      return this.timesheetService.getAttendanceStatistics(
        queryDto.user_id,
        queryDto.start_date,
        queryDto.end_date,
      );
    }
    
    if (isHrOrAdmin) {
      return this.timesheetService.getAllUsersAttendanceStatistics(
        queryDto.start_date,
        queryDto.end_date,
      );
    }
    
    return this.timesheetService.getAttendanceStatistics(
      currentuser_id,
      queryDto.start_date,
      queryDto.end_date,
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

  @Get('late-early-balance')
  @RequirePermission('attendance.read')
  @ApiOperation({
    summary: 'Lấy số phút đi muộn/về sớm đã được duyệt trong tháng',
    description: `
      Trả về thông tin số phút đi muộn/về sớm đã được duyệt (APPROVED) của user trong tháng hiện tại.
      
      **Response bao gồm:**
      - used_minutes: Tổng số phút đã dùng (late + early) từ các requests đã được duyệt
      - used_late_minutes: Số phút đi muộn đã được duyệt
      - used_early_minutes: Số phút về sớm đã được duyệt
      
      **Lưu ý:** Chỉ tính các requests đã được APPROVE, không có quota giới hạn.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
    schema: {
      example: {
        month: 12,
        year: 2025,
        used_minutes: 45,
        used_late_minutes: 30,
        used_early_minutes: 15,
      },
    },
  })
  getLateEarlyBalance(@GetCurrentUser('id') user_id: number) {
    return this.timesheetService.getLateEarlyBalance(user_id);
  }

  @Get('request-quota')
  @RequirePermission('attendance.read')
  @ApiOperation({
    summary: 'Lấy quota request quên chấm công & đi muộn/về sớm còn lại',
    description: `
      Trả về thông tin quota của requests trong tháng.
      
      **Giới hạn mặc định:**
      - Request quên chấm công: 3 lần/tháng
      - Request đi muộn/về sớm:
        + 3 requests/tháng (số lượng)
        + 120 phút/tháng (tổng late_minutes + early_minutes)
      
      **Lưu ý quan trọng:**
      - Các request bị REJECT không tính vào quota → Có thể tạo lại
      - Late/early có 2 giới hạn: phải đủ CẢ HAI mới tạo được request
      - Forgot checkin: Chỉ giới hạn theo SỐ LƯỢNG
      - Late/early: Giới hạn theo CẢ SỐ LƯỢNG VÀ TỔNG PHÚT
      
      **Response bao gồm:**
      - forgot_checkin: Thông tin quota theo số lượng requests
      - late_early: Thông tin quota theo CẢ số lượng VÀ tổng phút
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
    schema: {
      example: {
        month: 12,
        year: 2025,
        forgot_checkin: {
          quota: 3,
          used: 1,
          remaining: 2,
          exceeded: false,
        },
        late_early: {
          count_quota: 3,
          used_count: 2,
          remaining_count: 1,
          count_exceeded: false,
          minutes_quota: 120,
          used_minutes: 75,
          remaining_minutes: 45,
          minutes_exceeded: false,
          exceeded: false,
        },
        last_reset_date: '2025-11-30',
      },
    },
  })
  getRequestQuota(@GetCurrentUser('id') user_id: number) {
    return this.timesheetService.getRequestQuota(user_id);
  }

  // === ATTENDANCE LOGS MANAGEMENT ===

  @Post('attendance-logs')
  @RequirePermission('attendance.manage')
  @ApiOperation({ summary: 'Tạo log chấm công thủ công' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403 })
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
    @GetAuthContext() authContext: AuthorizationContext,
    @Query() paginationDto: AttendanceLogPaginationDto,
  ) {
    // Check roles với scope chính xác
    const canViewOtherUsers = authContext.hasRole(ROLE_NAMES.ADMIN, ScopeType.COMPANY)
      || authContext.hasRole(ROLE_NAMES.HR_MANAGER, ScopeType.COMPANY);
    return this.timesheetService.getAttendanceLogsPaginated(
      currentuser_id,
      paginationDto,
      canViewOtherUsers,
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
  @ApiOperation({ summary: 'Xóa log chấm công' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
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
