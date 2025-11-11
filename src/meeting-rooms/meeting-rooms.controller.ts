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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
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

  @Post('book')
  @RequirePermission('meeting_room.booking.create')
  @ApiOperation({ summary: 'Đặt phòng họp' })
  @ApiResponse({ status: 201, description: 'Đặt phòng thành công' })
  async book(
    @GetCurrentUser('id') userId: number,
    @Body() dto: CreateBookingDto,
  ) {
    return this.service.createBooking(userId, dto);
  }

  @Post('rooms')
  @RequirePermission('meeting_room.create')
  @ApiOperation({ summary: 'Tạo phòng họp' })
  createRoom(@Body() dto: CreateRoomDto) {
    return this.service.createRoom(dto);
  }

  @Get('rooms')
  @RequirePermission('meeting_room.read')
  @ApiOperation({ summary: 'Danh sách phòng họp (phân trang)' })
  findAllRooms(@Query() query: RoomPaginationDto) {
    return this.service.findAllRooms(query);
  }

  @Get('rooms/:id')
  @RequirePermission('meeting_room.read')
  @ApiOperation({ summary: 'Chi tiết phòng họp' })
  @ApiParam({ name: 'id', description: 'ID phòng họp' })
  findOneRoom(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneRoom(id);
  }

  @Patch('rooms/:id')
  @RequirePermission('meeting_room.update')
  @ApiOperation({ summary: 'Cập nhật phòng họp' })
  updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.service.updateRoom(id, dto);
  }

  @Delete('rooms/:id')
  @RequirePermission('meeting_room.delete')
  @ApiOperation({ summary: 'Xóa mềm phòng họp' })
  removeRoom(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeRoom(id);
  }

  @Get('bookings')
  @RequirePermission('meeting_room.booking.read')
  @ApiOperation({ summary: 'Danh sách lịch đặt phòng (phân trang)' })
  findAllBookings(@Query() query: BookingPaginationDto) {
    return this.service.findAllBookings(query);
  }

  @Get('bookings/:id')
  @RequirePermission('meeting_room.booking.read')
  @ApiOperation({ summary: 'Chi tiết lịch đặt phòng' })
  @ApiParam({ name: 'id', description: 'ID lịch đặt' })
  findOneBooking(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneBooking(id);
  }

  @Patch('bookings/:id')
  @RequirePermission('meeting_room.booking.update')
  @ApiOperation({ summary: 'Cập nhật lịch đặt phòng' })
  updateBooking(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') userId: number,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.service.updateBooking(id, userId, dto);
  }

  @Delete('bookings/:id')
  @RequirePermission('meeting_room.booking.delete')
  @ApiOperation({ summary: 'Xóa mềm lịch đặt phòng' })
  removeBooking(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') userId: number,
  ) {
    return this.service.removeBooking(id, userId);
  }
}
