import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { NotificationPaginationDto } from './dto/pagination-queries.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { isAdmin, extractUserRoleInfo } from '../auth/utils/role.utils';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from 'src/auth/decorators/get-current-user.decorator';

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
  ) {
    return this.notificationsService.create(createNotificationDto, creatorId);
  }

  @Get()
  @RequirePermission('notification.read')
  @ApiOperation({ summary: 'Lấy danh sách thông báo có phân trang và lọc' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thông báo thành công' })
  async findAll(
    @Query() paginationDto: NotificationPaginationDto,
    @GetCurrentUser('id') userId: number,
    @GetCurrentUser() user: any,
  ) {
    const userInfo = extractUserRoleInfo(user);
    const userIsAdmin = isAdmin(userInfo);
    return this.notificationsService.findAll(paginationDto, userId, userIsAdmin);
  }

  @Get(':id')
  @RequirePermission('notification.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết thông báo' })
  @ApiParam({ name: 'id', description: 'ID của thông báo' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thông báo thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') userId: number,
    @GetCurrentUser() user: any,
  ) {
    const userInfo = extractUserRoleInfo(user);
    const userIsAdmin = isAdmin(userInfo);
    return this.notificationsService.findOne(id, userId, userIsAdmin);
  }

  @Patch(':id')
  @RequirePermission('notification.update')
  @Roles(ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN, ROLE_NAMES.COMPANY_OWNER)
  @ApiOperation({ summary: 'Cập nhật thông báo (Admin only)' })
  @ApiParam({ name: 'id', description: 'ID của thông báo' })
  @ApiResponse({ status: 200, description: 'Cập nhật thông báo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật thông báo' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @GetCurrentUser('id') userId: number,
  ) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  @Patch(':id/read')
  @RequirePermission('notification.read')
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc/chưa đọc' })
  @ApiParam({ name: 'id', description: 'ID của thông báo (notification_id)' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái đọc thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async markAsRead(
    @Param('id', ParseIntPipe) notificationId: number,
    @Body() markReadDto: MarkReadDto,
    @GetCurrentUser('id') userId: number,
    @GetCurrentUser('role') userRole: string,
  ) {
    const isAdmin = userRole === ROLE_NAMES.ADMIN || userRole === ROLE_NAMES.SUPER_ADMIN || userRole === ROLE_NAMES.COMPANY_OWNER;
    return this.notificationsService.markAsRead(notificationId, userId, markReadDto.is_read, isAdmin);
  }

  @Delete(':id')
  @RequirePermission('notification.delete')
  @ApiOperation({ summary: 'Xóa thông báo (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID của thông báo (notification_id)' })
  @ApiResponse({ status: 200, description: 'Xóa thông báo thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa thông báo này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async remove(
    @Param('id', ParseIntPipe) notificationId: number,
    @GetCurrentUser('id') userId: number,
    @GetCurrentUser('role') userRole: string,
  ) {
    const isAdmin = userRole === ROLE_NAMES.ADMIN || userRole === ROLE_NAMES.SUPER_ADMIN || userRole === ROLE_NAMES.COMPANY_OWNER;
    return this.notificationsService.remove(notificationId, userId, isAdmin);
  }
}
