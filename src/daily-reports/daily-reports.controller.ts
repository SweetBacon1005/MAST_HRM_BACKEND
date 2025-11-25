import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Tạo daily report mới' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DailyReportEntity })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy dự án' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Không thuộc dự án' })
  create(@Body() dto: CreateDailyReportDto, @GetCurrentUser('id') user_id: number) {
    return this.service.create(dto, user_id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Lấy danh sách daily report của tôi' })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportPaginatedResponse })
  my(@GetCurrentUser('id') user_id: number, @Query() p: DailyReportPaginationDto) {
    return this.service.findMy(user_id, p);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết daily report' })
  @ApiParam({ name: 'id', description: 'ID của daily report', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy daily report' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách daily report' })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportPaginatedResponse })
  findAll(@GetCurrentUser('id') user_id: number, @Query() p: DailyReportPaginationDto) {
    return this.service.findAll(p, user_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa daily report' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy daily report' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Không có quyền' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Chỉ sửa được khi REJECTED' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDailyReportDto, @GetCurrentUser('id') user_id: number) {
    return this.service.update(id, dto, user_id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa daily report' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy daily report' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Không có quyền' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Chỉ xóa được khi PENDING' })
  remove(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') user_id: number) {
    return this.service.remove(id, user_id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Duyệt daily report' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy daily report' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Không có quyền duyệt' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Chỉ duyệt được khi PENDING' })
  approve(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') approverId: number) {
    return this.service.approve(id, approverId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Từ chối daily report' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        reject_reason: { type: 'string', example: 'Thiếu mô tả chi tiết' } 
      }, 
      required: ['reject_reason'] 
    } 
  })
  @ApiResponse({ status: HttpStatus.OK, type: DailyReportEntity })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy daily report' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Không có quyền từ chối' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Chỉ từ chối được khi PENDING' })
  reject(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') approverId: number, @Body('reject_reason') reason: string) {
    return this.service.reject(id, approverId, reason);
  }
}
