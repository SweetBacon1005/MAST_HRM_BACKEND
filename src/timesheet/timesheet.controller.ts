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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { DateRangeValidationPipe } from '../common/pipes/date-validation.pipe';
import { CheckinDto, CheckoutDto } from './dto/checkin-checkout.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { DateRangeQueryDto } from './dto/date-validation.dto';
import {
  HolidayPaginationDto,
  TimesheetPaginationDto,
} from './dto/pagination-queries.dto';
import { RegisterFaceDto } from './dto/register-face.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { TimesheetService } from './timesheet.service';

@ApiTags('Timesheet')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('timesheet')
export class TimesheetController {
  constructor(private readonly timesheetService: TimesheetService) {}

  // === TIMESHEET MANAGEMENT ===

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

}
