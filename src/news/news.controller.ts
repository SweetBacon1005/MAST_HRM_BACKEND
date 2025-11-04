import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
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
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ApproveNewsDto } from './dto/approve-news.dto';
import { NewsPaginationDto } from './dto/pagination-queries.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { NewsStatus } from '@prisma/client';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';

@ApiTags('news')
@Controller('news')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  @RequirePermission('news.create')
  @ApiOperation({ summary: 'Tạo tin tức mới' })
  @ApiResponse({ status: 201, description: 'Tạo tin tức thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() createNewsDto: CreateNewsDto, @GetCurrentUser('id') authorId: number) {
    return this.newsService.create(createNewsDto, authorId);
  }

  @Get()
  @RequirePermission('news.read')
  @ApiOperation({ summary: 'Lấy danh sách tin tức có phân trang và lọc' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách tin tức thành công' })
  async findAll(@Query() paginationDto: NewsPaginationDto) {
    return this.newsService.findAll(paginationDto);
  }

  @Get(':id')
  @RequirePermission('news.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết tin tức' })
  @ApiParam({ name: 'id', description: 'ID của tin tức (UUID)' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin tin tức thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tin tức' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') viewerId: number,
  ) {
    return this.newsService.findOne(id, viewerId);
  }

  @Patch(':id')
  @RequirePermission('news.update')
  @ApiOperation({ summary: 'Cập nhật tin tức (chỉ khi trạng thái là DRAFT hoặc REJECTED)' })
  @ApiParam({ name: 'id', description: 'ID của tin tức (UUID)' })
  @ApiResponse({ status: 200, description: 'Cập nhật tin tức thành công' })
  @ApiResponse({ status: 400, description: 'Tin tức không ở trạng thái DRAFT/REJECTED hoặc dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật tin tức này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tin tức' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNewsDto: UpdateNewsDto,
    @GetCurrentUser('id') userId: number,
  ) {
    return this.newsService.update(id, updateNewsDto, userId);
  }

  @Delete(':id')
  @RequirePermission('news.delete')
  @ApiOperation({ summary: 'Xóa tin tức (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID của tin tức (UUID)' })
  @ApiResponse({ status: 200, description: 'Xóa tin tức thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa tin tức này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tin tức' })
  async remove(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') userId: number, @GetCurrentUser('role') role: string) {
    return this.newsService.remove(id, userId, role);
  }


  @Patch(':id/submit')
  @RequirePermission('news.submit')
  @ApiOperation({ summary: 'Gửi tin tức để duyệt (chuyển từ DRAFT/REJECTED sang PENDING)' })
  @ApiParam({ name: 'id', description: 'ID của tin tức (UUID)' })
  @ApiResponse({ status: 200, description: 'Gửi tin tức để duyệt thành công' })
  @ApiResponse({ status: 400, description: 'Tin tức không ở trạng thái DRAFT/REJECTED' })
  @ApiResponse({ status: 403, description: 'Không có quyền gửi tin tức này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tin tức' })
  async submitForReview(@Param('id', ParseIntPipe) id: number, @GetCurrentUser('id') userId: number) {
    return this.newsService.submitForReview(id, userId);
  }

  @Patch(':id/review')
  @RequirePermission('news.approve')
  @ApiOperation({ summary: 'Duyệt hoặc từ chối tin tức (chỉ khi trạng thái là PENDING)' })
  @ApiParam({ name: 'id', description: 'ID của tin tức (UUID)' })
  @ApiResponse({ status: 200, description: 'Duyệt/Từ chối tin tức thành công' })
  @ApiResponse({ status: 400, description: 'Tin tức không ở trạng thái PENDING hoặc dữ liệu không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Không có quyền duyệt/từ chối tin tức này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tin tức' })
  async approveOrReject(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveNewsDto: ApproveNewsDto,
    @GetCurrentUser('id') reviewerId: number,
  ) {
    return this.newsService.approveOrReject(id, approveNewsDto.status, reviewerId, approveNewsDto.reason);
  }
}