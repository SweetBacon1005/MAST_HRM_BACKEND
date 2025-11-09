import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MeetingRoomsService } from './meeting-rooms.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { EnhancedRolesGuard } from '../auth/guards/enhanced-roles.guard';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';

@Controller('meeting-rooms')
export class MeetingRoomsController {
  constructor(private readonly service: MeetingRoomsService) {}

  @Post('book')
  @UseGuards(JwtAuthGuard, EnhancedRolesGuard)
  @Roles(
    ROLE_NAMES.ADMIN,
    ROLE_NAMES.PROJECT_MANAGER,
    ROLE_NAMES.TEAM_LEADER,
    ROLE_NAMES.DIVISION_HEAD,
    ROLE_NAMES.COMPANY_OWNER,
    ROLE_NAMES.SUPER_ADMIN,
  )
  async book(
    @GetCurrentUser('id') userId: number,
    @Body() dto: CreateBookingDto,
  ) {
    return this.service.createBooking(userId, dto);
  }
}
