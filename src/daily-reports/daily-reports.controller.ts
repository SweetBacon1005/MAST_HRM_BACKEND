import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { DailyReportsService } from './daily-reports.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { DailyReportPaginationDto } from './dto/pagination.dto';

@ApiTags('daily-reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('daily-reports')
export class DailyReportsController {
  constructor(private readonly service: DailyReportsService) {}

  @Post()
  @ApiOperation({ summary: 'T?o daily report m?i' })
  create(@Body() dto: CreateDailyReportDto, @GetCurrentUser('id') userId: number) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'L?y danh s�ch daily report' })
  findAll(@GetCurrentUser('id') userId: number, @Query() p: DailyReportPaginationDto ) {
    return this.service.findAll(p, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'L?y danh s�ch daily report c?a t�i' })
  my(@GetCurrentUser('id') userId: number, @Query() p: DailyReportPaginationDto ) {
    return this.service.findMy(userId, p);
  }

  @Get(':id')
  @ApiOperation({ summary: 'L?y chi ti?t daily report' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'S?a daily report (ch? khi REJECTED, s?a xong chuy?n PENDING)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDailyReportDto, @GetCurrentUser('id') userId: number) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'X�a daily report (ch? khi PENDING)' })
  remove(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') userId: number) {
    return this.service.remove(id, userId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Duy?t daily report' })
  approve(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') approverId: number) {
    return this.service.approve(id, approverId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'T? ch?i daily report' })
  @ApiBody({ schema: { type: 'object', properties: { reject_reason: { type: 'string', example: 'Thi?u m� t?' } }, required: ['reject_reason'] } })
  reject(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') approverId: number, @Body('reject_reason') reason: string) {
    return this.service.reject(id, approverId, reason);
  }
}




