import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { UpdateMilestoneProgressDto } from './dto/update-milestone-progress.dto';
import { MilestonePaginationDto } from './dto/milestone-pagination.dto';

@ApiTags('milestones')
@Controller('milestones')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post('projects/:projectId')
  @RequirePermission('milestone.create')
  @ApiOperation({ summary: 'Tạo mốc mới cho dự án' })
  @ApiParam({ name: 'projectId', description: 'ID của dự án' })
  @ApiResponse({
    status: 201,
    description: 'Tạo mốc thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc tên mốc đã tồn tại',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dự án',
  })
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(projectId, createMilestoneDto);
  }

  @Get()
  @RequirePermission('milestone.read')
  @ApiOperation({ summary: 'Lấy danh sách mốc có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách mốc thành công',
  })
  findAll(@Query() paginationDto: MilestonePaginationDto) {
    return this.milestonesService.findAll(paginationDto);
  }

  @Get('projects/:projectId')
  @RequirePermission('milestone.read')
  @ApiOperation({ summary: 'Lấy danh sách mốc theo dự án' })
  @ApiParam({ name: 'projectId', description: 'ID của dự án' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách mốc thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dự án',
  })
  findAllByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.milestonesService.findAllByProject(projectId);
  }

  @Get(':id')
  @RequirePermission('milestone.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết mốc' })
  @ApiParam({ name: 'id', description: 'ID của mốc' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin mốc thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mốc',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.milestonesService.findOne(id);
  }

  @Patch(':id/progress')
  @RequirePermission('milestone.update')
  @ApiOperation({ summary: 'Cập nhật tiến độ mốc (0-100)' })
  @ApiParam({ name: 'id', description: 'ID của mốc' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật tiến độ thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mốc',
  })
  updateProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProgressDto: UpdateMilestoneProgressDto,
  ) {
    return this.milestonesService.updateProgress(id, updateProgressDto.progress);
  }

  @Patch(':id')
  @RequirePermission('milestone.update')
  @ApiOperation({ summary: 'Cập nhật thông tin mốc' })
  @ApiParam({ name: 'id', description: 'ID của mốc' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật mốc thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mốc',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, updateMilestoneDto);
  }

  @Delete(':id')
  @RequirePermission('milestone.delete')
  @ApiOperation({ summary: 'Xóa mốc (Soft delete)' })
  @ApiParam({ name: 'id', description: 'ID của mốc' })
  @ApiResponse({
    status: 200,
    description: 'Xóa mốc thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mốc',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.milestonesService.remove(id);
  }
}
