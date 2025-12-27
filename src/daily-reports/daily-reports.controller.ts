import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AuthorizationContextService } from '../auth/services/authorization-context.service';
import { DailyReportsService } from './daily-reports.service';
import { ApproveBatchDto, BatchAction } from './dto/approve-batch.dto';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { DailyReportPaginationDto } from './dto/pagination.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import {
  DailyReportEntity,
  DailyReportPaginatedResponse,
} from './entities/daily-report.entity';
import { RoleContextLoaderGuard } from 'src/auth/guards/role-context-loader.guard';

@ApiTags('daily-reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard, RoleContextLoaderGuard)
@Controller('daily-reports')
export class DailyReportsController {
  constructor(
    private readonly service: DailyReportsService,
    private readonly authorizationContextService: AuthorizationContextService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo daily report mới' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DailyReportEntity })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy dự án',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không thuộc dự án',
  })
  create(
    @Body() dto: CreateDailyReportDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return this.service.create(dto, user_id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Lấy danh sách daily report của tôi' })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportPaginatedResponse })
  my(
    @GetCurrentUser('id') user_id: number,
    @Query() p: DailyReportPaginationDto,
  ) {
    return this.service.findMy(user_id, p);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết daily report' })
  @ApiParam({ name: 'id', description: 'ID của daily report', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy daily report',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách daily report' })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportPaginatedResponse })
  findAll(
    @GetCurrentUser('id') user_id: number,
    @Query() p: DailyReportPaginationDto,
  ) {
    return this.service.findAll(p, user_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa daily report' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy daily report',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Không có quyền' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Chỉ sửa được khi REJECTED',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDailyReportDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return this.service.update(id, dto, user_id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa daily report' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy daily report',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Không có quyền' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Chỉ xóa được khi PENDING',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') user_id: number,
  ) {
    return this.service.remove(id, user_id);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Duyệt daily report (scope-aware)',
    description:
      'Admin: approve tất cả | Division Head: approve projects trong division | Team Leader: approve projects trong team | Project Manager: approve projects quản lý',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy daily report',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không có quyền duyệt (ngoài scope quản lý)',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Chỉ duyệt được khi PENDING',
  })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: any,
  ) {
    const authContext =
      await this.authorizationContextService.createContext(user);
    return this.service.approve(id, authContext);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Từ chối daily report (scope-aware)',
    description:
      'Admin: reject tất cả | Division Head: reject projects trong division | Team Leader: reject projects trong team | Project Manager: reject projects quản lý',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rejected_reason: { type: 'string', example: 'Thiếu mô tả chi tiết' },
      },
      required: ['rejected_reason'],
    },
  })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy daily report',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không có quyền từ chối (ngoài scope quản lý)',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Chỉ từ chối được khi PENDING',
  })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser() user: any,
    @Body('rejected_reason') reason: string,
  ) {
    const authContext =
      await this.authorizationContextService.createContext(user);
    return this.service.reject(id, authContext, reason);
  }

  @Post('approve-by-user/:user_id')
  @ApiOperation({
    summary: 'Duyệt tất cả daily report PENDING của một user',
    description: `
      API này duyệt tất cả các daily report đang ở trạng thái PENDING của một user cụ thể.
      
      **Điều kiện:**
      - Chỉ duyệt được các report đang PENDING
      - Người duyệt phải có quyền duyệt trên TẤT CẢ các project của user đó
      - Nếu không có quyền duyệt trên một số project, API sẽ báo lỗi
      
      **Quyền duyệt:**
      - Admin: Có thể duyệt tất cả (trừ Division Head)
      - Division Head: Duyệt reports của projects thuộc division
      - Team Leader: Duyệt reports của projects thuộc team
      - Project Manager: Duyệt reports của projects quản lý
      
      **Use case:**
      - Duyệt hàng loạt cho một nhân viên cụ thể
      - Tiết kiệm thời gian khi user có nhiều report cần duyệt
    `,
  })
  @ApiParam({
    name: 'user_id',
    description: 'ID của user cần duyệt tất cả daily report',
    example: 5,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Duyệt thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        approved_count: { type: 'number', example: 5 },
        message: {
          type: 'string',
          example: 'Đã duyệt thành công 5 daily report của user 12',
        },
        reports: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              project_name: { type: 'string', example: 'Dự án ABC' },
              work_date: {
                type: 'string',
                format: 'date',
                example: '2024-12-05',
              },
              actual_time: { type: 'number', example: 8 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy daily report nào đang chờ duyệt',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Không có quyền duyệt một số daily report',
  })
  async approveAllByUser(
    @Param('user_id', ParseIntPipe) userId: number,
    @GetCurrentUser() user: any,
  ) {
    const authContext =
      await this.authorizationContextService.createContext(user);
    return this.service.approveAllByUser(userId, authContext);
  }

  @Post('approve-batch')
  @ApiOperation({
    summary: 'Duyệt nhiều daily report theo danh sách ID',
    description: `
      API này duyệt nhiều daily report cùng lúc theo danh sách ID.
      
      **Điều kiện:**
      - Tất cả các report phải tồn tại
      - Tất cả các report phải đang ở trạng thái PENDING
      - Người duyệt phải có quyền duyệt trên TẤT CẢ các report
      - Nếu có lỗi với bất kỳ report nào, toàn bộ batch sẽ bị reject
      
      **Quyền duyệt:**
      - Admin: Có thể duyệt tất cả (trừ Division Head)
      - Division Head: Duyệt reports của projects thuộc division
      - Team Leader: Duyệt reports của projects thuộc team
      - Project Manager: Duyệt reports của projects quản lý
      
      **Use case:**
      - Duyệt nhiều report của nhiều users khác nhau
      - Duyệt theo bộ lọc (ví dụ: tất cả report của một ngày)
      - Bulk approval từ giao diện quản lý
    `,
  })
  @ApiBody({
    type: ApproveBatchDto,
    examples: {
      example1: {
        summary: 'Duyệt 3 reports',
        value: {
          report_ids: [1, 2, 3],
        },
      },
      example2: {
        summary: 'Duyệt nhiều reports',
        value: {
          report_ids: [10, 15, 20, 25, 30, 35],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Duyệt thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        approved_count: { type: 'number', example: 3 },
        message: {
          type: 'string',
          example: 'Đã duyệt thành công 3 daily report',
        },
        reports: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              user_name: { type: 'string', example: 'Nguyễn Văn A' },
              project_name: { type: 'string', example: 'Dự án ABC' },
              work_date: {
                type: 'string',
                format: 'date',
                example: '2024-12-05',
              },
              actual_time: { type: 'number', example: 8 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Danh sách ID rỗng, lý do từ chối trống (khi reject), hoặc có report không ở trạng thái PENDING',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy một số daily report',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'Không có quyền xử lý một số daily report (ngoài scope quản lý)',
  })
  async approveBatch(
    @Body() dto: ApproveBatchDto,
    @GetCurrentUser() user: any,
  ) {
    const authContext =
      await this.authorizationContextService.createContext(user);
    return this.service.approveBatch(
      dto.report_ids,
      authContext,
      dto.action || BatchAction.APPROVE,
      dto.rejected_reason,
    );
  }
}
