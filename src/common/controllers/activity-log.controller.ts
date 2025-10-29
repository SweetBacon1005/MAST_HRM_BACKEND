import {
  Controller,
  Get,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { ActivityLogService } from '../services/activity-log.service';

class ActivityLogQueryDto {
  page?: number;
  limit?: number;
  logName?: string;
  event?: string;
  causerId?: number;
  subjectId?: number;
  subjectType?: string;
  startDate?: string;
  endDate?: string;
}

@ApiTags('Activity Logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @RequirePermission('system.admin')
  @ApiOperation({
    summary: 'Lấy danh sách activity logs (Admin only)',
    description: 'Xem tất cả hoạt động trong hệ thống để audit và monitoring',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng records per page' })
  @ApiQuery({ name: 'log_name', required: false, type: String, description: 'Lọc theo tên log' })
  @ApiQuery({ name: 'event', required: false, type: String, description: 'Lọc theo event' })
  @ApiQuery({ name: 'causer_id', required: false, type: Number, description: 'Lọc theo user thực hiện' })
  @ApiQuery({ name: 'subject_id', required: false, type: Number, description: 'Lọc theo đối tượng bị tác động' })
  @ApiQuery({ name: 'subject_type', required: false, type: String, description: 'Lọc theo loại đối tượng' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Từ ngày (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'Đến ngày (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách activity logs thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              log_name: { type: 'string' },
              description: { type: 'string' },
              subject_type: { type: 'string' },
              event: { type: 'string' },
              subject_id: { type: 'number' },
              causer_id: { type: 'number' },
              properties: { type: 'object' },
              batch_uuid: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              causer: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  email: { type: 'string' },
                  user_information: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                    },
                  },
                },
              },
              subject: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  email: { type: 'string' },
                  user_information: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                    },
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
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async getActivityLogs(@Query() query: ActivityLogQueryDto) {
    const options = {
      page: query.page ? parseInt(query.page.toString()) : 1,
      limit: query.limit ? parseInt(query.limit.toString()) : 20,
      logName: query.logName,
      event: query.event,
      causerId: query.causerId ? parseInt(query.causerId.toString()) : undefined,
      subjectId: query.subjectId ? parseInt(query.subjectId.toString()) : undefined,
      subjectType: query.subjectType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    return await this.activityLogService.getActivityLogs(options);
  }

  @Get('events')
  @RequirePermission('system.admin')
  @ApiOperation({
    summary: 'Lấy danh sách các events có sẵn',
    description: 'Để filter activity logs theo event',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách events',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'request.created',
            'request.approved',
            'request.rejected',
            'user.login',
            'user.logout',
            'role.assigned',
          ],
        },
      },
    },
  })
  async getAvailableEvents() {
    // Lấy danh sách events từ database
    const events = await this.activityLogService.prisma.activity_log.findMany({
      select: { event: true },
      distinct: ['event'],
      orderBy: { event: 'asc' },
    });

    return {
      events: events.map(e => e.event),
    };
  }

  @Get('log-names')
  @RequirePermission('system.admin')
  @ApiOperation({
    summary: 'Lấy danh sách các log names có sẵn',
    description: 'Để filter activity logs theo log name',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách log names',
    schema: {
      type: 'object',
      properties: {
        logNames: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Request Management',
            'Authentication',
            'Role Management',
            'Timesheet',
          ],
        },
      },
    },
  })
  async getAvailableLogNames() {
    // Lấy danh sách log names từ database
    const logNames = await this.activityLogService.prisma.activity_log.findMany({
      select: { log_name: true },
      distinct: ['log_name'],
      orderBy: { log_name: 'asc' },
    });

    return {
      logNames: logNames.map(l => l.log_name),
    };
  }
}
