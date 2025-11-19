import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { DailyReportsService } from './daily-reports.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { DailyReportPaginationDto } from './dto/pagination.dto';
import { DailyReportEntity, DailyReportPaginatedResponse } from './entities/daily-report.entity';

@ApiTags('daily-reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('daily-reports')
export class DailyReportsController {
  constructor(private readonly service: DailyReportsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Tạo daily report mới',
    description: 'Tạo báo cáo công việc hàng ngày. Trạng thái mặc định là PENDING.'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Tạo daily report thành công',
    type: DailyReportEntity
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Không tìm thấy dự án' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Dữ liệu không hợp lệ' 
  })
  create(@Body() dto: CreateDailyReportDto, @GetCurrentUser('id') userId: number) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lấy danh sách daily report',
    description: 'Lấy danh sách báo cáo theo quyền: Admin xem tất cả, Team Leader xem team, Project Manager xem project, Division Head xem division.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lấy danh sách thành công',
    type: DailyReportPaginatedResponse
  })
  findAll(@GetCurrentUser('id') userId: number, @Query() p: DailyReportPaginationDto) {
    return this.service.findAll(p, userId);
  }

  @Get('my')
  @ApiOperation({ 
    summary: 'Lấy danh sách daily report của tôi',
    description: 'Lấy tất cả báo cáo của người dùng hiện tại.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lấy danh sách thành công',
    type: DailyReportPaginatedResponse
  })
  my(@GetCurrentUser('id') userId: number, @Query() p: DailyReportPaginationDto) {
    return this.service.findMy(userId, p);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Lấy chi tiết daily report',
    description: 'Lấy thông tin chi tiết của một báo cáo theo ID.'
  })
  @ApiParam({ name: 'id', description: 'ID của daily report', example: 1 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lấy chi tiết thành công',
    type: DailyReportEntity
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Không tìm thấy daily report' 
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Sửa daily report',
    description: 'Chỉ có thể sửa báo cáo khi trạng thái là REJECTED. Sau khi sửa, trạng thái sẽ chuyển về PENDING.'
  })
  @ApiParam({ name: 'id', description: 'ID của daily report', example: 1 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Cập nhật thành công',
    type: DailyReportEntity
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Không tìm thấy daily report' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Không có quyền chỉnh sửa báo cáo này' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Chỉ có thể sửa báo cáo khi trạng thái là REJECTED' 
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDailyReportDto, @GetCurrentUser('id') userId: number) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Xóa daily report',
    description: 'Chỉ có thể xóa báo cáo khi trạng thái là PENDING.'
  })
  @ApiParam({ name: 'id', description: 'ID của daily report', example: 1 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Xóa thành công',
    type: DailyReportEntity
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Không tìm thấy daily report' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Không có quyền xóa báo cáo này' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Chỉ có thể xóa báo cáo khi trạng thái là PENDING' 
  })
  remove(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') userId: number) {
    return this.service.remove(id, userId);
  }

  @Post(':id/approve')
  @ApiOperation({ 
    summary: 'Duyệt daily report',
    description: 'Phê duyệt báo cáo. Quyền duyệt: Team Leader duyệt member, Project Manager duyệt team/member, Division Head duyệt PM/TL/member.'
  })
  @ApiParam({ name: 'id', description: 'ID của daily report', example: 1 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Duyệt thành công',
    type: DailyReportEntity
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Không tìm thấy daily report' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Không có quyền duyệt báo cáo này' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Chỉ có thể duyệt báo cáo khi trạng thái là PENDING' 
  })
  approve(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') approverId: number) {
    return this.service.approve(id, approverId);
  }

  @Post(':id/reject')
  @ApiOperation({ 
    summary: 'Từ chối daily report',
    description: 'Từ chối báo cáo và ghi lý do. Quyền từ chối tương tự quyền duyệt.'
  })
  @ApiParam({ name: 'id', description: 'ID của daily report', example: 1 })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        reject_reason: { 
          type: 'string', 
          example: 'Thiếu mô tả chi tiết công việc',
          description: 'Lý do từ chối báo cáo'
        } 
      }, 
      required: ['reject_reason'] 
    } 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Từ chối thành công',
    type: DailyReportEntity
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Không tìm thấy daily report' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Không có quyền từ chối báo cáo này' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Chỉ có thể từ chối báo cáo khi trạng thái là PENDING' 
  })
  reject(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') approverId: number, @Body('reject_reason') reason: string) {
    return this.service.reject(id, approverId, reason);
  }
}




