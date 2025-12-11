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
import { MeetingRoomsService } from './meeting-rooms.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomPaginationDto } from './dto/room-pagination.dto';
import { BookingPaginationDto } from './dto/booking-pagination.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('meeting-rooms')
@Controller('meeting-rooms')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class MeetingRoomsController {
  constructor(private readonly service: MeetingRoomsService) {}

  // ==================== ROOMS MANAGEMENT ====================

  @Get('rooms')
  @RequirePermission('meeting_room.read')
  @ApiOperation({ 
    summary: 'Danh sách phòng họp (phân trang)',
    description: 'Lấy danh sách phòng họp với phân trang, tìm kiếm và lọc',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy danh sách thành công',
    schema: {
      example: {
        data: [
          { id: 1, name: 'Phòng họp A', is_active: true },
          { id: 2, name: 'Phòng họp B', is_active: true },
        ],
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  findAllRooms(@Query() query: RoomPaginationDto) {
    return this.service.findAllRooms(query);
  }

  @Get('rooms/:id')
  @RequirePermission('meeting_room.read')
  @ApiOperation({ 
    summary: 'Chi tiết phòng họp',
    description: 'Lấy thông tin chi tiết của một phòng họp',
  })
  @ApiParam({ name: 'id', description: 'ID phòng họp', example: 1 })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ApiResponse({ status: 404, description: 'Phòng họp không tồn tại' })
  findOneRoom(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneRoom(id);
  }

  @Post('rooms')
  @RequirePermission('meeting_room.create')
  @ApiOperation({ 
    summary: 'Tạo phòng họp',
    description: 'Tạo phòng họp mới trong hệ thống',
  })
  @ApiBody({ type: CreateRoomDto })
  @ApiResponse({ status: 201, description: 'Tạo phòng họp thành công' })
  @ApiResponse({ status: 400, description: 'Tên phòng đã tồn tại' })
  createRoom(@Body() dto: CreateRoomDto) {
    return this.service.createRoom(dto);
  }

  @Patch('rooms/:id')
  @RequirePermission('meeting_room.update')
  @ApiOperation({ 
    summary: 'Cập nhật phòng họp',
    description: 'Cập nhật thông tin phòng họp',
  })
  @ApiParam({ name: 'id', description: 'ID phòng họp', example: 1 })
  @ApiBody({ type: UpdateRoomDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Tên phòng đã tồn tại' })
  @ApiResponse({ status: 404, description: 'Phòng họp không tồn tại' })
  updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.service.updateRoom(id, dto);
  }

  @Delete('rooms/:id')
  @RequirePermission('meeting_room.delete')
  @ApiOperation({ 
    summary: 'Xóa mềm phòng họp',
    description: 'Xóa phòng họp (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'ID phòng họp', example: 1 })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Phòng họp không tồn tại' })
  removeRoom(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeRoom(id);
  }

  // ==================== BOOKINGS MANAGEMENT ====================

  @Get('bookings')
  @RequirePermission('meeting_room.booking.read')
  @ApiOperation({ 
    summary: 'Danh sách lịch đặt phòng (phân trang)',
    description: 'Lấy danh sách tất cả lịch đặt phòng với phân trang và lọc',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy danh sách thành công',
  })
  findAllBookings(@Query() query: BookingPaginationDto) {
    return this.service.findAllBookings(query);
  }

  @Get('my-bookings')
  @RequirePermission('meeting_room.booking.read')
  @ApiOperation({ 
    summary: 'Lịch đặt phòng của tôi (phân trang)',
    description: 'Lấy danh sách lịch đặt phòng của người dùng hiện tại',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy danh sách thành công',
  })
  findMyBookings(
    @GetCurrentUser('id') user_id: number,
    @Query() query: BookingPaginationDto,
  ) {
    return this.service.findMyBookings(user_id, query);
  }

  @Get('bookings/:id')
  @RequirePermission('meeting_room.booking.read')
  @ApiOperation({ 
    summary: 'Chi tiết lịch đặt phòng',
    description: 'Lấy thông tin chi tiết của một lịch đặt phòng',
  })
  @ApiParam({ name: 'id', description: 'ID lịch đặt', example: 1 })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ApiResponse({ status: 404, description: 'Lịch đặt phòng không tồn tại' })
  findOneBooking(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneBooking(id);
  }

  @Post('bookings')
  @RequirePermission('meeting_room.booking.create')
  @ApiOperation({ 
    summary: 'Đặt phòng họp',
    description: 'Tạo lịch đặt phòng họp mới với ngày và giờ cụ thể. Kiểm tra xung đột lịch và giới hạn thời gian tối đa 4 giờ.',
  })
  @ApiBody({ 
    type: CreateBookingDto,
    examples: {
      example1: {
        summary: 'Đặt phòng họp buổi sáng',
        value: {
          room_id: 1,
          title: 'Họp team Sprint Planning',
          description: 'Thảo luận kế hoạch sprint tiếp theo',
          booking_date: '2024-01-15',
          start_hour: '09:00',
          end_hour: '11:00',
        },
      },
      example2: {
        summary: 'Đặt phòng họp buổi chiều',
        value: {
          room_id: 2,
          title: 'Họp với khách hàng',
          booking_date: '2024-01-20',
          start_hour: '14:00',
          end_hour: '16:30',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Đặt phòng thành công',
    schema: {
      example: {
        id: 1,
        room_id: 1,
        title: 'Họp team Sprint Planning',
        description: 'Thảo luận kế hoạch sprint tiếp theo',
        start_time: '2024-01-15T09:00:00.000Z',
        end_time: '2024-01-15T11:00:00.000Z',
        organizer_id: 5,
        created_at: '2024-01-10T08:00:00.000Z',
        room: {
          id: 1,
          name: 'Phòng họp A',
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ, phòng bị trùng lịch, hoặc giờ không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Phòng họp không tồn tại' })
  createBooking(
    @GetCurrentUser('id') user_id: number,
    @Body() dto: CreateBookingDto,
  ) {
    return this.service.createBooking(user_id, dto);
  }

  @Patch('bookings/:id')
  @RequirePermission('meeting_room.booking.update')
  @ApiOperation({ 
    summary: 'Cập nhật lịch đặt phòng',
    description: 'Cập nhật thông tin lịch đặt phòng (chỉ organizer được phép)',
  })
  @ApiParam({ name: 'id', description: 'ID lịch đặt', example: 1 })
  @ApiBody({ type: UpdateBookingDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc phòng bị trùng lịch' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật lịch đặt này' })
  @ApiResponse({ status: 404, description: 'Lịch đặt phòng không tồn tại' })
  updateBooking(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.service.updateBooking(id, user_id, dto);
  }

  @Delete('bookings/:id')
  @RequirePermission('meeting_room.booking.delete')
  @ApiOperation({ 
    summary: 'Xóa mềm lịch đặt phòng',
    description: 'Xóa lịch đặt phòng (chỉ organizer được phép)',
  })
  @ApiParam({ name: 'id', description: 'ID lịch đặt', example: 1 })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa lịch đặt này' })
  @ApiResponse({ status: 404, description: 'Lịch đặt phòng không tồn tại' })
  removeBooking(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
  ) {
    return this.service.removeBooking(id, user_id);
  }
}
