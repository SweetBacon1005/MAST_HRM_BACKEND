import {
  BadRequestException,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { DivisionService } from './division.service';
import { BirthdayQueryDto } from './dto/birthday-query.dto';
import { CreateDivisionDto } from './dto/create-division.dto';
import { DivisionDashboardQueryDto } from './dto/dashboard-query.dto';
import { DivisionMembersQueryDto } from './dto/division-members-query.dto';
import { DivisionPaginationDto } from './dto/pagination-queries.dto';
import {
  CreateRotationMemberDto,
  RotationMemberPaginationDto,
  UpdateRotationMemberDto,
} from './dto/rotation-member.dto';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import {
  CreateTeamDto,
  TeamPaginationDto,
  UpdateTeamDto,
} from './dto/team.dto';
import { UpdateDivisionDto } from './dto/update-division.dto';
import {
  CreateUserDivisionDto,
  UnassignedUsersPaginationDto,
  UpdateUserDivisionDto,
  UserDivisionPaginationDto,
} from './dto/user-division.dto';
import { WorkInfoQueryDto } from './dto/work-info-query.dto';
import { DIVISION_ERRORS } from 'src/common/constants/error-messages.constants';

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
  create(@Body() createDivisionDto: CreateDivisionDto, @GetCurrentUser('id') currentuser_id: number) {
    createDivisionDto.creator_id = currentuser_id;
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
  @ApiOperation({
    summary: 'Lấy cây phòng ban theo cấu trúc phân cấp (Phòng ban cha)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cây phòng ban thành công',
  })
  @ApiQuery({
    name: 'parent_id',
    description: 'ID của phòng ban cha',
    required: false,
    type: Number,
  })
  getHierarchy(@Query('parent_id') parentId?: number) {
    return this.divisionService.getDivisionHierarchy(parentId);
  }

  @Get('rotation-members')
  @RequirePermission('personnel.transfer.read')
  @ApiOperation({ summary: 'Lấy danh sách điều chuyển nhân sự có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách điều chuyển thành công',
  })
  findAllRotationMembers(
    @Query() paginationDto: RotationMemberPaginationDto,
    @GetCurrentUser('id') currentuser_id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    // Nếu là division_head: ép division_id theo division hiện tại của user
    if (Array.isArray(roles) && roles.includes(ROLE_NAMES.DIVISION_HEAD)) {
      return this.divisionService
        .findOneUserDivision(currentuser_id)
        .then((userDivision) => {
          const currentdivision_id = (userDivision as any)?.data?.division?.id;
          const effectiveDto = { ...paginationDto };
          if (typeof currentdivision_id === 'number') {
            effectiveDto.division_id = currentdivision_id;
          }
          return this.divisionService.findAllRotationMembers(effectiveDto);
        });
    }
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

  // === USER DIVISION ASSIGNMENT ===

  @Post('user-assignments')
  @RequirePermission('division.assignment.create')
  @ApiOperation({ summary: 'Thêm user vào division' })
  @ApiResponse({
    status: 201,
    description: 'Thêm user vào division thành công',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Thêm user vào division thành công',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            user_id: { type: 'number', example: 5 },
            division_id: { type: 'number', example: 2 },
            role_id: { type: 'number', example: 3 },
            team_id: { type: 'number', example: 1 },
            description: {
              type: 'string',
              example: 'Developer chính của team',
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 5 },
                email: { type: 'string', example: 'user@example.com' },
                user_information: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Nguyễn Văn A' },
                    code: { type: 'string', example: 'NV001' },
                    avatar: { type: 'string', example: 'avatar.jpg' },
                  },
                },
              },
            },
            division: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 2 },
                name: { type: 'string', example: 'Phòng Phát triển' },
              },
            },
            role: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 3 },
                name: { type: 'string', example: 'Developer' },
              },
            },
            team: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Team Frontend' },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User đã được gán vào division này hoặc dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'User, Division, Role hoặc Team không tồn tại',
  })
  createUserDivision(
    @Body() createUserDivisionDto: CreateUserDivisionDto,
    @GetCurrentUser('id') currentuser_id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (Array.isArray(roles) && roles.includes(ROLE_NAMES.DIVISION_HEAD)) {
      return this.divisionService
        .findOneUserDivision(currentuser_id)
        .then((userDivision) => {
          const currentdivision_id = (userDivision as any)?.data?.division?.id;
          const effectiveDto = { ...createUserDivisionDto };
          if (typeof currentdivision_id === 'number') {
            effectiveDto.division_id = currentdivision_id;
          }
          return this.divisionService.createUserDivision(effectiveDto);
        });
    }
    return this.divisionService.createUserDivision(createUserDivisionDto);
  }

  @Get('user-assignments')
  @RequirePermission('division.assignment.read')
  @ApiOperation({
    summary: 'Lấy danh sách user division assignments có phân trang',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách assignments thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              user_id: { type: 'number', example: 5 },
              division_id: { type: 'number', example: 2 },
              role_id: { type: 'number', example: 3 },
              team_id: { type: 'number', example: 1 },
              description: {
                type: 'string',
                example: 'Developer chính của team',
              },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 5 },
                  email: { type: 'string', example: 'user@example.com' },
                  user_information: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'Nguyễn Văn A' },
                      code: { type: 'string', example: 'NV001' },
                      avatar: { type: 'string', example: 'avatar.jpg' },
                    },
                  },
                },
              },
              division: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 2 },
                  name: { type: 'string', example: 'Phòng Phát triển' },
                },
              },
              role: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 3 },
                  name: { type: 'string', example: 'Developer' },
                },
              },
              team: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'Team Frontend' },
                },
              },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total_pages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAllUserDivisions(
    @Query() paginationDto: UserDivisionPaginationDto,
    @GetCurrentUser('id') currentuser_id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (Array.isArray(roles) && roles.includes(ROLE_NAMES.DIVISION_HEAD)) {
      return this.divisionService
        .findOneUserDivision(currentuser_id)
        .then((userDivision) => {
          const currentdivision_id = (userDivision as any)?.data?.division?.id;
          const effectiveDto = { ...paginationDto };
          if (typeof currentdivision_id === 'number') {
            effectiveDto.division_id = currentdivision_id;
          }
          return this.divisionService.findAllUserDivisions(effectiveDto);
        });
    }
    return this.divisionService.findAllUserDivisions(paginationDto);
  }

  @Get('unassigned-users')
  @RequirePermission('division.assignment.read')
  @ApiOperation({
    summary: 'Lấy danh sách users chưa được gán vào division nào',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách users chưa được gán thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 5, description: 'ID của user' },
              email: {
                type: 'string',
                example: 'user@example.com',
                description: 'Email của user',
              },
              name: {
                type: 'string',
                example: 'Nguyễn Văn A',
                description: 'Tên đầy đủ',
              },
              code: {
                type: 'string',
                example: 'NV001',
                description: 'Mã nhân viên',
              },
              avatar: {
                type: 'string',
                example: 'avatar.jpg',
                description: 'Link avatar',
              },
              birthday: {
                type: 'string',
                format: 'date',
                example: '1990-01-01',
                description: 'Ngày sinh',
              },
              phone: {
                type: 'string',
                example: '+84901234567',
                description: 'Số điện thoại',
              },
              address: {
                type: 'string',
                example: '123 Main St',
                description: 'Địa chỉ',
              },
              position: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'Developer' },
                },
                description: 'Thông tin vị trí công việc',
              },
              level: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number', example: 2 },
                  name: { type: 'string', example: 'Junior' },
                  coefficient: { type: 'number', example: 1.2 },
                },
                description: 'Thông tin level',
              },
              role: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number', example: 3 },
                  name: { type: 'string', example: 'Employee' },
                },
                description: 'Thông tin role hệ thống',
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: 'Ngày tạo tài khoản',
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              example: 25,
              description: 'Tổng số users chưa được gán',
            },
            page: { type: 'number', example: 1, description: 'Trang hiện tại' },
            limit: {
              type: 'number',
              example: 10,
              description: 'Số bản ghi trên mỗi trang',
            },
            total_pages: {
              type: 'number',
              example: 3,
              description: 'Tổng số trang',
            },
          },
        },
      },
    },
  })
  findUnassignedUsers(@Query() paginationDto: UnassignedUsersPaginationDto) {
    return this.divisionService.getUnassignedUsers(paginationDto);
  }

  @Get('user-assignments/:user_id')
  @RequirePermission('division.assignment.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết user division' })
  @ApiParam({ name: 'user_id', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin user division thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy user division',
  })
  findOneUserDivision(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.divisionService.findOneUserDivision(user_id);
  }

  @Patch('user-assignments/:user_id')
  @RequirePermission('division.assignment.update')
  @ApiOperation({ summary: 'Cập nhật user division assignment' })
  @ApiParam({ name: 'user_id', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật assignment thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy assignment, role hoặc team',
  })
  updateUserDivision(
    @Param('user_id', ParseIntPipe) user_id: number,
    @Body() updateUserDivisionDto: UpdateUserDivisionDto,
  ) {
    return this.divisionService.updateUserDivision(
      user_id,
      updateUserDivisionDto,
    );
  }

  @Delete('user-assignments/:user_id')
  @RequirePermission('division.assignment.delete')
  @ApiOperation({ summary: 'Xóa user khỏi division' })
  @ApiParam({ name: 'user_id', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Xóa user khỏi division thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy user division',
  })
  removeUserDivision(@Param('user_id', ParseIntPipe) user_id: number, @GetCurrentUser('id') currentuser_id: number, @GetCurrentUser('roles') roles: string[]) {
    return this.divisionService.removeUserDivision(user_id, currentuser_id, roles);
  }

  @Get('teams')
  @RequirePermission('team.read')
  @ApiOperation({ summary: 'Lấy danh sách teams có phân trang' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách teams thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string', description: 'Tên team' },
              division_id: { type: 'number', description: 'ID phòng ban' },
              manager: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  avatar: { type: 'string' },
                },
                description: 'Thông tin người quản lý',
              },
              member_count: {
                type: 'number',
                description: 'Số lượng thành viên',
              },
              resource_by_level: {
                type: 'object',
                description: 'Phân bổ nhân lực theo level',
                additionalProperties: { type: 'number' },
              },
              active_projects: {
                type: 'string',
                description: 'Danh sách dự án đang hoạt động',
              },
              founding_date: {
                type: 'string',
                format: 'date',
                description: 'Ngày thành lập',
              },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            total_pages: { type: 'number' },
          },
        },
      },
    },
  })
  findAllTeams(
    @Query() paginationDto: TeamPaginationDto,
    @GetCurrentUser('id') currentuser_id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (Array.isArray(roles) && roles.includes(ROLE_NAMES.DIVISION_HEAD)) {
      return this.divisionService
        .findOneUserDivision(currentuser_id)
        .then((userDivision) => {
          const currentdivision_id = (userDivision as any)?.data?.division?.id;
          const effectiveDto = { ...paginationDto };
          if (typeof currentdivision_id === 'number') {
            effectiveDto.division_id = currentdivision_id;
          }
          return this.divisionService.findAllTeams(effectiveDto);
        });
    }
    return this.divisionService.findAllTeams(paginationDto);
  }

  @Get('teams/:id')
  @RequirePermission('team.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết team' })
  @ApiParam({ name: 'id', description: 'ID của team' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin team thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy team',
  })
  findOneTeam(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.findOneTeam(id);
  }

  @Get(':id/members')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy danh sách thành viên của phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phòng ban' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành viên thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'number', description: 'ID của user' },
              code: { type: 'string', description: 'Mã nhân viên' },
              name: { type: 'string', description: 'Tên nhân viên' },
              email: { type: 'string', description: 'Email' },
              avatar: { type: 'string', description: 'Link avatar' },
              birthday: {
                type: 'string',
                format: 'date',
                description: 'Ngày sinh',
              },
              team: { type: 'string', description: 'Tên team/phòng ban' },
              team_id: { type: 'number', description: 'ID team/phòng ban' },
              join_date: {
                type: 'string',
                format: 'date',
                description: 'Ngày vào làm',
              },
              months_of_service: {
                type: 'number',
                description: 'Số tháng thâm niên',
              },
              position: { type: 'string', description: 'Vị trí' },
              position_id: { type: 'number', description: 'ID vị trí' },
              skills: {
                type: 'string',
                description: 'Danh sách kỹ năng (ngăn cách bởi dấu phẩy)',
              },
              level: { type: 'string', description: 'Level' },
              level_id: { type: 'number', description: 'ID level' },
              coefficient: { type: 'number', description: 'Hệ số' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', description: 'Tổng số bản ghi' },
            page: { type: 'number', description: 'Trang hiện tại' },
            limit: { type: 'number', description: 'Số bản ghi trên mỗi trang' },
            total_pages: { type: 'number', description: 'Tổng số trang' },
          },
        },
      },
    },
  })
  getDivisionMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: DivisionMembersQueryDto,
    @GetCurrentUser('id') currentuser_id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    queryDto.roles = roles;
    queryDto.current_user_id = currentuser_id;
    return this.divisionService.getDivisionMembers(id, queryDto);
  }

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
            total_members: {
              type: 'number',
              description: 'Tổng số thành viên',
            },
            working_count: {
              type: 'number',
              description: 'Số người đang làm việc',
            },
            work_date: { type: 'string', description: 'Ngày làm việc' },
          },
        },
        leave_requests: {
          type: 'object',
          properties: {
            paid_leave_count: {
              type: 'number',
              description: 'Số nhân viên nghỉ phép có lương',
            },
            unpaid_leave_count: {
              type: 'number',
              description: 'Số nhân viên nghỉ phép không lương',
            },
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
              days_until_birthday: {
                type: 'number',
                description: 'Số ngày tới sinh nhật',
              },
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
              actual_late_hours: {
                type: 'number',
                description: 'Số giờ đi muộn thực tế (được duyệt)',
              },
              overtime_hours: {
                type: 'number',
                description: 'Số giờ làm thêm',
              },
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

  @Get(':id/birthday-employees')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy danh sách nhân viên có sinh nhật trong tháng' })
  @ApiParam({ name: 'id', description: 'ID của phòng ban' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách nhân viên sinh nhật thành công',
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
        employees: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'number' },
              name: { type: 'string' },
              email: { type: 'string' },
              avatar: { type: 'string' },
              birthday: { type: 'string' },
              days_until_birthday: { type: 'number' },
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
  getBirthdayEmployees(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: BirthdayQueryDto,
  ) {
    return this.divisionService.getBirthdayEmployees(id, queryDto.month);
  }

  @Get(':id/work-info')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy thông tin làm việc của phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phòng ban' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin làm việc thành công',
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
        work_date: { type: 'string' },
        working_info: {
          type: 'object',
          properties: {
            total_members: { type: 'number' },
            working_count: { type: 'number' },
            work_date: { type: 'string' },
            employees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user_id: { type: 'number' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  avatar: { type: 'string' },
                  position: { type: 'string' },
                  checkin_time: { type: 'string' },
                  checkout_time: { type: 'string' },
                  status: { type: 'string' },
                  duration: { type: 'string' },
                },
              },
            },
          },
        },

        leave_requests: {
          type: 'object',
          properties: {
            approved_count: { type: 'number' },
            pending_count: { type: 'number' },
            employees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user_id: { type: 'number' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  avatar: { type: 'string' },
                  position: { type: 'string' },
                  leave_type: { type: 'string' },
                  reason: { type: 'string' },
                  start_date: { type: 'string' },
                  end_date: { type: 'string' },
                  status: { type: 'string' },
                  duration: { type: 'string' },
                },
              },
            },
          },
        },
        late_info: {
          type: 'object',
          properties: {
            late_count: { type: 'number' },
            minutes: { type: 'number' },
            employees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  user_id: { type: 'number' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  avatar: { type: 'string' },
                  position: { type: 'string' },
                  checkin_time: { type: 'string' },
                  late_minutes: { type: 'number' },
                  status: { type: 'string' },
                  duration: { type: 'string' },
                },
              },
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
  getWorkInfo(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: WorkInfoQueryDto,
  ) {
    return this.divisionService.getWorkInfo(id, queryDto.work_date);
  }

  @Get(':id/statistics')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy thống kê chấm công theo năm của phòng ban' })
  @ApiParam({ name: 'id', description: 'ID của phòng ban' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê thành công',
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
        year: { type: 'number' },
        attendance_stats: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              month: { type: 'number' },
              late_hours: { type: 'number' },
              actual_late_hours: { type: 'number' },
              overtime_hours: { type: 'number' },
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
  getStatistics(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryDto: StatisticsQueryDto,
  ) {
    return this.divisionService.getStatistics(id, queryDto.year);
  }

  @Get(':id/users')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy danh sách users trong division' })
  @ApiParam({ name: 'id', description: 'ID của division' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách users thành công',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              user_id: { type: 'number', example: 5 },
              division_id: { type: 'number', example: 2 },
              role_id: { type: 'number', example: 3 },
              team_id: { type: 'number', example: 1 },
              description: {
                type: 'string',
                example: 'Developer chính của team',
              },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 5 },
                  email: { type: 'string', example: 'user@example.com' },
                  user_information: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'Nguyễn Văn A' },
                      code: { type: 'string', example: 'NV001' },
                      avatar: { type: 'string', example: 'avatar.jpg' },
                      position: {
                        type: 'object',
                        properties: {
                          id: { type: 'number', example: 1 },
                          name: { type: 'string', example: 'Developer' },
                        },
                      },
                      level: {
                        type: 'object',
                        properties: {
                          id: { type: 'number', example: 2 },
                          name: { type: 'string', example: 'Junior' },
                          coefficient: { type: 'number', example: 1.2 },
                        },
                      },
                    },
                  },
                },
              },
              role: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 3 },
                  name: { type: 'string', example: 'Developer' },
                },
              },
              team: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'Team Frontend' },
                },
              },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 20 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total_pages: { type: 'number', example: 2 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy division',
  })
  getUsersByDivision(
    @Param('id', ParseIntPipe) id: number,
    @Query() paginationDto: UserDivisionPaginationDto,
  ) {
    return this.divisionService.getUsersByDivision(id, paginationDto);
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
    @GetCurrentUser('id') requesterId: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    return this.divisionService.createRotationMember(
      createRotationDto,
      requesterId,
      roles
    );
  }

  // === TEAM MANAGEMENT ===

  @Post('teams')
  @RequirePermission('team.create')
  @ApiOperation({ summary: 'Tạo team mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo team thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc tên team đã tồn tại',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy phòng ban hoặc người quản lý',
  })
  createTeam(@Body() createTeamDto: CreateTeamDto, @GetCurrentUser('id') assignedBy: number) {
    return this.divisionService.createTeam(createTeamDto, assignedBy);
  }

  @Patch('teams/:id')
  @RequirePermission('team.update')
  @ApiOperation({ summary: 'Cập nhật thông tin team' })
  @ApiParam({ name: 'id', description: 'ID của team' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật team thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc tên team đã tồn tại',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy team hoặc người quản lý',
  })
  updateTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.divisionService.updateTeam(id, updateTeamDto);
  }

  @Delete('teams/:id')
  @RequirePermission('team.delete')
  @ApiOperation({ summary: 'Xóa team' })
  @ApiParam({ name: 'id', description: 'ID của team' })
  @ApiResponse({
    status: 200,
    description: 'Xóa team thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa team vì còn thành viên hoặc dự án',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy team',
  })
  removeTeam(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.removeTeam(id);
  }
}
