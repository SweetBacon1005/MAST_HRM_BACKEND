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
  })
  @ApiResponse({
    status: 400,
  })
  @ApiResponse({
    status: 404,
  })
  create(
    @Body() createDivisionDto: CreateDivisionDto,
    @GetCurrentUser('id') currentuser_id: number,
  ) {
    createDivisionDto.creator_id = currentuser_id;
    return this.divisionService.create(createDivisionDto);
  }

  @Get()
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy danh sách phòng ban có phân trang' })
  @ApiResponse({
    status: 200,
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
  })
  @ApiQuery({
    name: 'parent_id',
    required: false,
    type: Number,
  })
  getHierarchy(@Query('parent_id') parentId?: number) {
    return this.divisionService.getDivisionHierarchy(parentId);
  }

  // === ROTATION MEMBERS (PERSONNEL TRANSFER) ===

  @Post('rotation-members')
  @RequirePermission('personnel.transfer.create')
  @ApiOperation({ summary: 'Tạo điều chuyển nhân sự' })
  @ApiResponse({
    status: 201,
  })
  @ApiResponse({
    status: 400,
  })
  @ApiResponse({
    status: 404,
  })
  createRotationMember(
    @Body() createRotationDto: CreateRotationMemberDto,
    @GetCurrentUser('id') requesterId: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    return this.divisionService.createRotationMember(
      createRotationDto,
      requesterId,
      roles,
    );
  }

  @Get('rotation-members')
  @RequirePermission('personnel.transfer.read')
  @ApiOperation({ summary: 'Lấy danh sách điều chuyển nhân sự có phân trang' })
  @ApiResponse({
    status: 200,
  })
  findAllRotationMembers(
    @Query() paginationDto: RotationMemberPaginationDto,
    @GetCurrentUser('id') currentuser_id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    // Nếu là division_head: ép division_id theo division hiện tại của user
    if (Array.isArray(roles) && !roles.includes(ROLE_NAMES.ADMIN)) {
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
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 404,
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
  })
  @ApiResponse({
    status: 404,
  })
  createUserDivision(
    @Body() createUserDivisionDto: CreateUserDivisionDto,
    @GetCurrentUser('id') currentuser_id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (Array.isArray(roles) && !roles.includes(ROLE_NAMES.ADMIN)) {
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
    if (Array.isArray(roles) && !roles.includes(ROLE_NAMES.ADMIN)) {
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
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 5 },
              email: {
                type: 'string',
                example: 'user@example.com',
              },
              name: {
                type: 'string',
                example: 'Nguyễn Văn A',
              },
              code: {
                type: 'string',
                example: 'NV001',
              },
              avatar: {
                type: 'string',
                example: 'avatar.jpg',
              },
              birthday: {
                type: 'string',
                format: 'date',
                example: '1990-01-01',
              },
              phone: {
                type: 'string',
                example: '+84901234567',
              },
              address: {
                type: 'string',
                example: '123 Main St',
              },
              position: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number', example: 1 },
                  name: { type: 'string', example: 'Developer' },
                },
              },
              level: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number', example: 2 },
                  name: { type: 'string', example: 'Junior' },
                  coefficient: { type: 'number', example: 1.2 },
                },
              },
              role: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number', example: 3 },
                  name: { type: 'string', example: 'Employee' },
                },
              },
              created_at: {
                type: 'string',
                format: 'date-time',
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
            },
            page: { type: 'number', example: 1 },
            limit: {
              type: 'number',
              example: 10,
            },
            total_pages: {
              type: 'number',
              example: 3,
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
  @ApiParam({ name: 'user_id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 404,
  })
  findOneUserDivision(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.divisionService.findOneUserDivision(user_id);
  }

  @Patch('user-assignments/:user_id')
  @RequirePermission('division.assignment.update')
  @ApiOperation({ summary: 'Cập nhật user division assignment' })
  @ApiParam({ name: 'user_id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 400,
  })
  @ApiResponse({
    status: 404,
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
  @ApiParam({ name: 'user_id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 404,
  })
  removeUserDivision(
    @Param('user_id', ParseIntPipe) user_id: number,
    @GetCurrentUser('id') currentuser_id: number,
    @GetCurrentUser('roles') roles: string[],
  ) {
    return this.divisionService.removeUserDivision(
      user_id,
      currentuser_id,
      roles,
    );
  }

  @Get('teams')
  @RequirePermission('team.read')
  @ApiOperation({ summary: 'Lấy danh sách teams có phân trang' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              division_id: { type: 'number' },
              manager: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  avatar: { type: 'string' },
                },
              },
              member_count: {
                type: 'number',
              },
              resource_by_level: {
                type: 'object',
                additionalProperties: { type: 'number' },
              },
              active_projects: {
                type: 'string',
              },
              founding_date: {
                type: 'string',
                format: 'date',
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
    if (Array.isArray(roles) && !roles.includes(ROLE_NAMES.ADMIN)) {
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

  // === TEAM MANAGEMENT ===

  @Post('teams')
  @RequirePermission('team.create')
  @ApiOperation({ summary: 'Tạo team mới' })
  @ApiResponse({
    status: 201,
  })
  @ApiResponse({
    status: 400,
  })
  @ApiResponse({
    status: 404,
  })
  createTeam(
    @Body() createTeamDto: CreateTeamDto,
    @GetCurrentUser('id') assignedBy: number,
  ) {
    return this.divisionService.createTeam(createTeamDto, assignedBy);
  }

  @Get('teams/:id')
  @RequirePermission('team.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết team' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 404,
  })
  findOneTeam(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.findOneTeam(id);
  }

  @Patch('teams/:id')
  @RequirePermission('team.update')
  @ApiOperation({ summary: 'Cập nhật thông tin team' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 400,
  })
  @ApiResponse({
    status: 404,
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
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 400,
  })
  @ApiResponse({
    status: 404,
  })
  removeTeam(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.removeTeam(id);
  }

  // === DIVISION DETAIL ENDPOINTS (WITH PARAM :id) ===

  @Get(':id/members')
  @RequirePermission('division.read')
  @ApiOperation({ summary: 'Lấy danh sách thành viên của phòng ban' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'number' },
              code: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              avatar: { type: 'string' },
              birthday: {
                type: 'string',
                format: 'date',
              },
              team: { type: 'string' },
              team_id: { type: 'number' },
              join_date: {
                type: 'string',
                format: 'date',
              },
              months_of_service: {
                type: 'number',
              },
              position: { type: 'string' },
              position_id: { type: 'number' },
              skills: {
                type: 'string',
              },
              level: { type: 'string' },
              level_id: { type: 'number' },
              coefficient: { type: 'number' },
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
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
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
            },
            working_count: {
              type: 'number',
            },
            work_date: { type: 'string' },
          },
        },
        leave_requests: {
          type: 'object',
          properties: {
            paid_leave_count: {
              type: 'number',
            },
            unpaid_leave_count: {
              type: 'number',
            },
          },
        },
        late_info: {
          type: 'object',
          properties: {
            late_count: { type: 'number' },
            early_count: { type: 'number' },
          },
        },
        recent_birthday_employees: {
          type: 'array',
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
              },
            },
          },
        },
        attendance_stats: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              month: { type: 'number' },
              late_hours: { type: 'number' },
              actual_late_hours: {
                type: 'number',
              },
              overtime_hours: {
                type: 'number',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
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
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
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
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
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
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
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
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
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
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 404,
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('division.update')
  @ApiOperation({ summary: 'Cập nhật thông tin phòng ban' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 400,
  })
  @ApiResponse({
    status: 404,
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
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
  })
  @ApiResponse({
    status: 400,
  })
  @ApiResponse({
    status: 404,
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.remove(id);
  }
}
