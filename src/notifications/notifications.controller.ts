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
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser } from 'src/auth/decorators/get-current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AUTH_ERRORS } from 'src/common/constants/error-messages.constants';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { NotificationPaginationDto } from './dto/pagination-queries.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequirePermission('notification.create')
  @ApiOperation({ summary: 'Tạo thông báo mới (Admin only)' })
  @ApiResponse({ status: 201, description: 'Tạo thông báo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền tạo thông báo' })
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @GetCurrentUser('id') creatorId: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (!roles.includes(ROLE_NAMES.ADMIN)) {
      throw new BadRequestException(AUTH_ERRORS.FORBIDDEN);
    }
    return this.notificationsService.create(createNotificationDto, creatorId);
  }

  @Get()
  @RequirePermission('notification.read')
  @ApiOperation({ summary: 'Lấy danh sách thông báo cho user' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thông báo thành công',
  })
  async findAll(@GetCurrentUser('id') user_id: number) {
    return this.notificationsService.findAll(user_id);
  }

  @Get('/admin')
  @RequirePermission('notification.read')
  @ApiOperation({
    summary: 'Lấy danh sách thông báo cho admin có phân trang và lọc',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thông báo thành công',
  })
  async findAllForAdmin(
    @Query() paginationDto: NotificationPaginationDto,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (!roles.includes(ROLE_NAMES.ADMIN)) {
      throw new BadRequestException(AUTH_ERRORS.FORBIDDEN);
    }
    return this.notificationsService.findAllForAdmin(paginationDto);
  }

  @Get('/admin/:notificationId')
  @Roles(ROLE_NAMES.ADMIN)
  @RequirePermission('notification.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết thông báo cho admin' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thông báo thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async findOne(
    @Param('notificationId', ParseIntPipe) id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (!roles.includes(ROLE_NAMES.ADMIN)) {
      throw new BadRequestException(AUTH_ERRORS.FORBIDDEN);
    }
    return this.notificationsService.findOne(id);
  }

  @Patch('admin/:notificationId')
  @RequirePermission('notification.update')
  @ApiOperation({ summary: 'Cập nhật thông báo (Admin only)' })
  @ApiParam({ name: 'notificationId', description: 'ID của thông báo' })
  @ApiResponse({ status: 200, description: 'Cập nhật thông báo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền cập nhật thông báo',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async update(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (!roles.includes(ROLE_NAMES.ADMIN)) {
      throw new BadRequestException(AUTH_ERRORS.FORBIDDEN);
    }
    return this.notificationsService.update(
      notificationId,
      updateNotificationDto,
    );
  }

  @Patch(':id/read')
  @RequirePermission('notification.read')
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc/chưa đọc' })
  @ApiParam({ name: 'id', description: 'ID của thông báo (notification_id)' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái đọc thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async markAsRead(
    @Param('id', ParseIntPipe) userNotificationId: number,
    @Body() markReadDto: MarkReadDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return this.notificationsService.markAsRead(
      userNotificationId,
      user_id,
      markReadDto.is_read,
    );
  }

  @Delete('admin/:notificationId')
  @RequirePermission('notification.delete')
  @ApiOperation({ summary: 'Xóa thông báo (soft delete)' })
  @ApiParam({
    name: 'notificationId',
    description: 'ID của thông báo (notification_id)',
  })
  @ApiResponse({ status: 200, description: 'Xóa thông báo thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa thông báo này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  @Roles(ROLE_NAMES.ADMIN)
  async remove(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @GetCurrentUser('id') user_id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (!roles.includes(ROLE_NAMES.ADMIN)) {
      throw new BadRequestException(AUTH_ERRORS.FORBIDDEN);
    }
    return this.notificationsService.remove(notificationId, user_id);
  }
}
