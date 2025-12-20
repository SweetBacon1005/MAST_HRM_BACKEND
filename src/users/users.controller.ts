import {
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
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersPaginationDto } from './dto/pagination-queries.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission('user.create')
  @ApiOperation({ summary: 'Tạo user mới' })
  @ApiResponse({
    status: 201,
    })
  @ApiResponse({
    status: 400,
    })
  create(
    @Body() createUserDto: CreateUserDto,
    @GetCurrentUser('id') assignedBy: number,
  ) {
    return this.usersService.create(createUserDto, assignedBy);
  }

  @Get()
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy danh sách users có phân trang' })
  @ApiResponse({
    status: 200,
    })
  findAll(@Query() paginationDto: UsersPaginationDto) {
    return this.usersService.findAllPaginated(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin user theo ID' })
  @ApiParam({ name: 'id', })
  @ApiResponse({
    status: 200,
    })
  @ApiResponse({
    status: 404,
    })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    const { password, ...safeUser } = user;

    return safeUser;
  }

  @Patch(':id')
  @RequirePermission('user.update')
  @ApiOperation({ summary: 'Cập nhật thông tin user' })
  @ApiParam({ name: 'id', })
  @ApiResponse({
    status: 200,
    })
  @ApiResponse({
    status: 404,
    })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetCurrentUser('id') updatedBy: number,
  ) {
    return this.usersService.update(+id, updateUserDto, updatedBy);
  }

  @Delete(':id')
  @RequirePermission('user.delete')
  @ApiOperation({ summary: 'Xóa user' })
  @ApiParam({ name: 'id', })
  @ApiResponse({
    status: 200,
    })
  @ApiResponse({
    status: 404,
    })
  remove(
    @Param('id') id: string,
    @GetCurrentUser('id') deletedBy: number,
  ) {
    return this.usersService.remove(+id, deletedBy);
  }

  @Patch(':id/unregister-face')
  @RequirePermission('user.update')
  @ApiOperation({
    summary: 'Hủy đăng ký khuôn mặt',
    description: 'Xóa thông tin đăng ký khuôn mặt của user (set register_face_url và register_face_at về null)',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Hủy đăng ký khuôn mặt thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Hủy đăng ký khuôn mặt thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            register_face_url: { type: 'null' },
            register_face_at: { type: 'null' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user' })
  unregisterFace(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.unregisterFace(id);
  }
}
