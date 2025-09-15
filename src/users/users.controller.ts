import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersPaginationDto } from './dto/pagination-queries.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo user mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo user thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả users' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách users',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Lấy danh sách users có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách users có phân trang',
  })
  findAllPaginated(@Query() paginationDto: UsersPaginationDto) {
    return this.usersService.findAllPaginated(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin user theo ID' })
  @ApiParam({ name: 'id', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin user',
  })
  @ApiResponse({
    status: 404,
    description: 'User không tồn tại',
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin user' })
  @ApiParam({ name: 'id', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'User không tồn tại',
  })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa user' })
  @ApiParam({ name: 'id', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'User không tồn tại',
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
