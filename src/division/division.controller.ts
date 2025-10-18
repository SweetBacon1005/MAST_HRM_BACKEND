import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
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
import { DivisionService } from './division.service';
import { CreateDivisionDto } from './dto/create-division.dto';
import { UpdateDivisionDto } from './dto/update-division.dto';
import {
  DivisionPaginationDto,
  DivisionAssignmentPaginationDto,
} from './dto/pagination-queries.dto';
import {
  CreateDivisionAssignmentDto,
  UpdateDivisionAssignmentDto,
} from './dto/division-assignment.dto';
import {
  CreateRotationMemberDto,
  UpdateRotationMemberDto,
  RotationMemberPaginationDto,
} from './dto/rotation-member.dto';
import { DivisionDashboardQueryDto } from './dto/dashboard-query.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('divisions')
@Controller('divisions')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class DivisionController {
  constructor(private readonly divisionService: DivisionService) {}

  // === DIVISION CRUD ===

  @Post()
  @RequirePermission('division.create')
  @ApiOperation({ summary: 'Tạo phòng ban mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo phòng ban thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc tên phòng ban đã tồn tại',
  })
  @ApiResponse({
    status: 404,
    description: 'Phòng ban cha không tồn tại',
  })
  create(@Body() createDivisionDto: CreateDivisionDto) {
    return this.divisionService.create(createDivisionDto);
  }

  @Get()
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy danh sách phòng ban có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách phòng ban thành công',
  })
  findAll(@Query() paginationDto: DivisionPaginationDto) {
    return this.divisionService.findAll(paginationDto);
  }

  @Get('hierarchy')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy cây phòng ban theo cấu trúc phân cấp' })
  @ApiResponse({
    status: 200,
    description: 'Lấy cây phòng ban thành công',
  })
  getHierarchy(@Query('parent_id', ParseIntPipe) parentId?: number) {
    return this.divisionService.getDivisionHierarchy(parentId);
  }

  @Get(':id')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phòng ban' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin phòng ban thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng ban',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.findOne(id);
  }

  @Get(':id/members')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy danh sách thành viên của phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phòng ban' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành viên thành công',
  })
  getDivisionMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginationDto: DivisionPaginationDto,
  ) {
    return this.divisionService.getDivisionMembers(id, paginationDto);
  }

  @Patch(':id')
  @RequirePermission('division.update')
  @ApiOperation({ summary: 'Cập nhật thông tin phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phòng ban' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật phòng ban thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc tên phòng ban đã tồn tại',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng ban',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDivisionDto: UpdateDivisionDto,
  ) {
    return this.divisionService.update(id, updateDivisionDto);
  }

  @Delete(':id')
  @RequirePermission('division.delete')
  @ApiOperation({ summary: 'Xóa phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phòng ban' })
  @ApiResponse({
    status: 200,
    description: 'Xóa phòng ban thành công',
  })
  @ApiResponse({
    status: 400,
    description:
      'Không thể xóa phòng ban có phòng ban con, nhân viên hoặc dự án',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng ban',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.remove(id);
  }

  // === DIVISION ASSIGNMENTS ===

  @Post('assignments')
  @RequirePermission('division.assignment.create')
  @ApiOperation({ summary: 'Tạo phân công phòng ban cho nhân viên' })
  @ApiResponse({
    status: 201,
    description: 'Tạo phân công thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc trùng lặp phân công',
  })
  @ApiResponse({
    status: 404,
    description: 'Phòng ban hoặc người dùng không tồn tại',
  })
  createAssignment(@Body() createAssignmentDto: CreateDivisionAssignmentDto) {
    return this.divisionService.createAssignment(createAssignmentDto);
  }

  @Get('assignments')
  @RequirePermission('division.assignment.read')
  @ApiOperation({ summary: 'Lấy danh sách phân công phòng ban có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách phân công thành công',
  })
  findAllAssignments(@Query() paginationDto: DivisionAssignmentPaginationDto) {
    return this.divisionService.findAllAssignments(paginationDto);
  }

  @Get('assignments/:id')
  @RequirePermission('division.assignment.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết phân công phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phân công' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin phân công thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phân công phòng ban',
  })
  findOneAssignment(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.findOneAssignment(id);
  }

  @Patch('assignments/:id')
  @RequirePermission('division.assignment.update')
  @ApiOperation({ summary: 'Cập nhật phân công phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phân công' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật phân công thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phân công phòng ban',
  })
  updateAssignment(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAssignmentDto: UpdateDivisionAssignmentDto,
  ) {
    return this.divisionService.updateAssignment(id, updateAssignmentDto);
  }

  @Delete('assignments/:id')
  @RequirePermission('division.assignment.delete')
  @ApiOperation({ summary: 'Xóa phân công phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phân công' })
  @ApiResponse({
    status: 200,
    description: 'Xóa phân công thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phân công phòng ban',
  })
  removeAssignment(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.removeAssignment(id);
  }

  // === ROTATION MEMBERS (PERSONNEL TRANSFER) ===

  @Post('rotation-members')
  @RequirePermission('personnel.transfer.create')
  @ApiOperation({ summary: 'Tạo điều chuyển nhân sự' })
  @ApiResponse({
    status: 201,
    description: 'Tạo điều chuyển thành công',
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu không hợp lệ hoặc người dùng đã có điều chuyển tương tự',
  })
  @ApiResponse({
    status: 404,
    description: 'Người dùng hoặc phòng ban không tồn tại',
  })
  createRotationMember(
    @Body() createRotationDto: CreateRotationMemberDto,
    @GetUser('id') requesterId: number,
  ) {
    return this.divisionService.createRotationMember(
      createRotationDto,
      requesterId,
    );
  }

  @Get('rotation-members')
  @RequirePermission('personnel.transfer.read')
  @ApiOperation({ summary: 'Lấy danh sách điều chuyển nhân sự có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách điều chuyển thành công',
  })
  findAllRotationMembers(@Query() paginationDto: RotationMemberPaginationDto) {
    return this.divisionService.findAllRotationMembers(paginationDto);
  }

  @Get('rotation-members/:id')
  @RequirePermission('personnel.transfer.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết điều chuyển nhân sự' })
  @ApiParam({ name: 'id', description: 'ID của điều chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin điều chuyển thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy điều chuyển',
  })
  findOneRotationMember(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.findOneRotationMember(id);
  }

  @Patch('rotation-members/:id')
  @RequirePermission('personnel.transfer.update')
  @ApiOperation({ summary: 'Cập nhật điều chuyển nhân sự' })
  @ApiParam({ name: 'id', description: 'ID của điều chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật điều chuyển thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy điều chuyển',
  })
  updateRotationMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRotationDto: UpdateRotationMemberDto,
  ) {
    return this.divisionService.updateRotationMember(id, updateRotationDto);
  }

  @Delete('rotation-members/:id')
  @RequirePermission('personnel.transfer.delete')
  @ApiOperation({ summary: 'Xóa điều chuyển nhân sự' })
  @ApiParam({ name: 'id', description: 'ID của điều chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Xóa điều chuyển thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy điều chuyển',
  })
  deleteRotationMember(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.deleteRotationMember(id);
  }

  // === DASHBOARD ===

  @Get(':id/dashboard')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy dữ liệu dashboard cho phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phòng ban' })
  @ApiResponse({
    status: 200,
    description: 'Lấy dữ liệu dashboard thành công',
    schema: {
      type: 'object',
      properties: {
        division: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
          },
        },
        month: { type: 'number' },
        year: { type: 'number' },
        working_info: {
          type: 'object',
          properties: {
            total_members: { type: 'number', description: 'Tổng số thành viên' },
            working_count: { type: 'number', description: 'Số người đang làm việc' },
            work_date: { type: 'string', description: 'Ngày làm việc' },
          },
        },
        leave_requests: {
          type: 'object',
          properties: {
            approved_count: { type: 'number', description: 'Số đơn nghỉ phép được duyệt' },
            rejected_count: { type: 'number', description: 'Số đơn nghỉ phép bị từ chối' },
          },
        },
        late_info: {
          type: 'object',
          properties: {
            late_count: { type: 'number', description: 'Số lượt đi muộn' },
            early_count: { type: 'number', description: 'Số lượt về sớm' },
          },
        },
        recent_birthday_employees: {
          type: 'array',
          description: 'Danh sách nhân viên có sinh nhật trong tháng',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'number' },
              name: { type: 'string' },
              email: { type: 'string' },
              avatar: { type: 'string' },
              birthday: { type: 'string' },
              birthday_date: { type: 'number' },
              birthday_month: { type: 'number' },
              days_until_birthday: { type: 'number', description: 'Số ngày tới sinh nhật' },
            },
          },
        },
        attendance_stats: {
          type: 'array',
          description: 'Thống kê attendance theo tháng trong năm',
          items: {
            type: 'object',
            properties: {
              month: { type: 'number' },
              late_hours: { type: 'number', description: 'Số giờ đi muộn' },
              actual_late_hours: { type: 'number', description: 'Số giờ đi muộn thực tế (được duyệt)' },
              overtime_hours: { type: 'number', description: 'Số giờ làm thêm' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng ban',
  })
  getDashboard(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: DivisionDashboardQueryDto,
  ) {
    return this.divisionService.getDashboard(id, queryDto.month, queryDto.year);
  }
}
