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
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectProgressDto } from './dto/update-progress.dto';
import { ProjectPaginationDto } from './dto/project-pagination.dto';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermission('project.create')
  @ApiOperation({ summary: 'Tạo dự án mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo dự án thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc mã dự án đã tồn tại',
  })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @RequirePermission('project.read')
  @ApiOperation({ summary: 'Lấy danh sách dự án có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách dự án thành công',
  })
  findAll(@Query() paginationDto: ProjectPaginationDto) {
    return this.projectsService.findAll(paginationDto);
  }

  @Get('my')
  @RequirePermission('project.read')
  @ApiOperation({ summary: 'Lấy danh sách dự án của user hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách dự án thành công',
  })
  findMy(
    @Query() paginationDto: ProjectPaginationDto,
    @GetCurrentUser('id') userId: number,
  ) {
    return this.projectsService.findMyProjects(paginationDto, userId);
  }

  @Get(':id/members')
  @RequirePermission('project.read')
  @ApiOperation({ summary: 'Lấy danh sách thành viên của dự án' })
  @ApiParam({ name: 'id', description: 'ID của dự án' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành viên thành công',
  })
  getProjectMembers(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getProjectMembers(id);
  }

  @Get(':id')
  @RequirePermission('project.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết dự án' })
  @ApiParam({ name: 'id', description: 'ID của dự án' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin dự án thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dự án',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id/progress')
  @RequirePermission('project.update')
  @ApiOperation({ summary: 'Cập nhật tiến độ dự án (0-100)' })
  @ApiParam({ name: 'id', description: 'ID của dự án' })
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
    description: 'Không tìm thấy dự án',
  })
  updateProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProgressDto: UpdateProjectProgressDto,
  ) {
    return this.projectsService.updateProgress(id, updateProgressDto.progress);
  }

  @Patch(':id')
  @RequirePermission('project.update')
  @ApiOperation({ summary: 'Cập nhật thông tin dự án' })
  @ApiParam({ name: 'id', description: 'ID của dự án' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật dự án thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dự án',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @RequirePermission('project.delete')
  @ApiOperation({ summary: 'Xóa dự án (Soft delete)' })
  @ApiParam({ name: 'id', description: 'ID của dự án' })
  @ApiResponse({
    status: 200,
    description: 'Xóa dự án thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy dự án',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id);
  }
}

