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
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { GetCurrentUser } from '../auth/decorators/get-current-user.decorator';
import { GetAuthContext } from '../auth/decorators/get-auth-context.decorator';
import type { AuthorizationContext } from '../auth/services/authorization-context.service';
import { ScopeType } from '@prisma/client';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RoleContextLoaderGuard } from '../auth/guards/role-context-loader.guard';
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
@UseGuards(JwtAuthGuard, RoleContextLoaderGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class DivisionController {
  constructor(private readonly divisionService: DivisionService) {}

  // === DIVISION CRUD ===

  @Post()
  @RequirePermission('division.create')
  @ApiOperation({
    summary: 'Tạo phòng ban mới',
    description: `
      Tạo division mới trong hệ thống với đầy đủ thông tin.
      
      **Logic xử lý:**
      1. Kiểm tra tên division đã tồn tại chưa
      2. Tạo division với thông tin được cung cấp
      3. Tự động gán leader làm Division Head
      
      **Quyền:**
      - Chỉ Admin mới có thể tạo division mới
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo division thành công',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: ['TECHNICAL', 'BUSINESS', 'OPERATIONS', 'OTHER'],
        },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
        address: { type: 'string', nullable: true },
        description: { type: 'string', nullable: true },
        founding_at: { type: 'string', format: 'date-time' },
        division_head: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Tên division đã tồn tại hoặc dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy leader',
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
  @ApiOperation({
    summary: 'Lấy danh sách phòng ban có phân trang',
    description: `
      Lấy danh sách divisions với phân trang và filter.
      
      **Filters hỗ trợ:**
      - search: Tìm theo tên division
      - type: Lọc theo loại (TECHNICAL, BUSINESS, OPERATIONS, OTHER)
      - status: Lọc theo trạng thái (ACTIVE, INACTIVE)
      
      **Dữ liệu trả về cho mỗi division:**
      - Thông tin cơ bản (id, name, type, status, address...)
      - Member count (số lượng thành viên)
      - Project count (số lượng dự án)
      
      **Pagination:**
      - page: Trang hiện tại (default: 1)
      - limit: Số items mỗi trang (default: 10)
      - sort_by, sort_order: Sắp xếp
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách divisions với phân trang',
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
              type: { type: 'string' },
              status: { type: 'string' },
              member_count: { type: 'number' },
              project_count: { type: 'number' },
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
  getHierarchy() {
    return this.divisionService.getDivisionHierarchy();
  }

  // === ROTATION MEMBERS (PERSONNEL TRANSFER) ===

  @Post('rotation-members')
  @RequirePermission('personnel.transfer.create')
  @ApiOperation({
    summary: 'Tạo điều chuyển nhân sự',
    description: `
      Chuyển user từ division hiện tại sang division mới.
      
      **Logic xử lý tự động:**
      1. Xóa user khỏi TẤT CẢ TEAMS của division cũ
      2. Xóa user khỏi TẤT CẢ PROJECTS của division cũ (bao gồm cả PM role)
      3. Xóa user khỏi division cũ
      4. Gán user vào division mới với role Employee
      
      **Lưu ý:**
      - User sẽ mất quyền truy cập toàn bộ teams/projects cũ
      - Cần assign lại vào teams mới trong division mới
      - PM role trong projects cũ cũng bị xóa
      
      **Quyền:**
      - Admin: Có thể transfer bất kỳ ai
      - Division Head: Chỉ transfer được members trong division mình quản lý
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo điều chuyển thành công',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        user_id: { type: 'number' },
        from_id: { type: 'number' },
        to_id: { type: 'number' },
        type: { type: 'string', enum: ['PERMANENT', 'TEMPORARY'] },
        date_rotation: { type: 'string', format: 'date' },
        from_division: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
          },
        },
        removed_from: {
          type: 'object',
          properties: {
            teams: { type: 'number', description: 'Số lượng teams bị xóa' },
            projects: {
              type: 'number',
              description: 'Số lượng projects bị xóa',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User chưa được gán division hoặc không có quyền transfer',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy user hoặc division',
  })
  createRotationMember(
    @Body() createRotationDto: CreateRotationMemberDto,
    @GetCurrentUser('id') requesterId: number,
    @GetAuthContext() authContext: AuthorizationContext,
  ) {
    // Check ADMIN với COMPANY scope (chính xác hơn)
    const isAdmin = authContext.hasRole(ROLE_NAMES.ADMIN, ScopeType.COMPANY);
    return this.divisionService.createRotationMember(
      createRotationDto,
      requesterId,
      isAdmin,
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
    @GetAuthContext() authContext: AuthorizationContext,
  ) {
    // Nếu không phải Admin ở COMPANY scope: ép division_id theo division hiện tại của user
    if (!authContext.hasRole(ROLE_NAMES.ADMIN, ScopeType.COMPANY)) {
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
  @ApiOperation({
    summary: 'Thêm user vào division',
    description: `
      Gán user vào division với role cụ thể.
      
      **Logic xử lý:**
      1. Kiểm tra user chưa thuộc division nào (1 user chỉ thuộc 1 division)
      2. Validate division tồn tại
      3. Validate role hợp lệ
      4. Tạo assignment với scope_type = DIVISION
      
      **Quy tắc:**
      - 1 user CHỈ có thể thuộc 1 division duy nhất
      - Nếu user đã có division, phải remove khỏi division cũ trước
      - Hoặc dùng API rotation-members để chuyển division
      
      **Quyền:**
      - Admin: Assign vào bất kỳ division nào
      - Division Head: Assign vào division mình quản lý
    `,
  })
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
    @GetAuthContext() authContext: AuthorizationContext,
  ) {
    // Nếu không phải Admin ở COMPANY scope: ép division_id theo division hiện tại của user
    if (!authContext.hasRole(ROLE_NAMES.ADMIN, ScopeType.COMPANY)) {
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
    @GetAuthContext() authContext: AuthorizationContext,
  ) {
    // Nếu không phải Admin ở COMPANY scope: ép division_id theo division hiện tại của user
    if (!authContext.hasRole(ROLE_NAMES.ADMIN, ScopeType.COMPANY)) {
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
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết user division',
    description: `
      Lấy thông tin division hiện tại của user.
      
      **Thông tin trả về:**
      - User information (id, email, name, code, avatar...)
      - Division information (id, name, type, status...)
      - Role trong division
      - Join date (ngày vào division)
      - Description (mô tả vai trò)
      
      **Use case:**
      - Kiểm tra user thuộc division nào
      - Lấy thông tin để rotation
      - Hiển thị trên profile user
    `,
  })
  @ApiParam({ name: 'user_id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin division của user',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            user_id: { type: 'number' },
            email: { type: 'string' },
            name: { type: 'string' },
            division: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                type: { type: 'string' },
              },
            },
            role: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
              },
            },
            join_date: { type: 'string', format: 'date-time' },
            description: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User chưa được gán division',
  })
  findOneUserDivision(@Param('user_id', ParseIntPipe) user_id: number) {
    return this.divisionService.findOneUserDivision(user_id);
  }

  @Patch('user-assignments/:user_id')
  @RequirePermission('division.assignment.update')
  @ApiOperation({
    summary: 'Cập nhật user division assignment',
    description: `
      Cập nhật thông tin assignment của user trong division.
      
      **Có thể cập nhật:**
      - role_id: Thay đổi role trong division (Employee, Division Head...)
      - description: Mô tả vai trò
      
      **KHÔNG thể cập nhật:**
      - division_id: Không thể chuyển division ở đây (dùng rotation-members API)
      - user_id: Không thể thay đổi user
      
      **Lưu ý:**
      - Khi đổi role sang Division Head, phải xóa Division Head cũ trước
      - Hoặc dùng API assign-division-head để tự động xử lý
    `,
  })
  @ApiParam({ name: 'user_id', description: 'User ID' })
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
    description: 'Không tìm thấy user hoặc assignment',
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
  @ApiOperation({
    summary: 'Xóa user khỏi division',
    description: `
      Xóa user khỏi division (soft delete assignment).
      
      **Logic xử lý:**
      1. Kiểm tra user có assignment trong division không
      2. Soft delete assignment (set deleted_at)
      3. User sẽ không còn thuộc division nào
      
      **Lưu ý quan trọng:**
      - User vẫn còn trong teams và projects của division
      - Cần remove khỏi teams/projects riêng nếu muốn
      - Hoặc dùng rotation-members API để tự động xóa toàn bộ
      
      **Use case:**
      - Remove user tạm thời khỏi division
      - Chuẩn bị assign vào division mới
      - User nghỉ việc (nên dùng rotation thay vì API này)
    `,
  })
  @ApiParam({ name: 'user_id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa user khỏi division thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy assignment',
  })
  removeUserDivision(
    @Param('user_id', ParseIntPipe) user_id: number,
    @GetCurrentUser('id') currentuser_id: number,
    @GetAuthContext() authContext: AuthorizationContext,
  ) {
    // Check ADMIN với COMPANY scope (chính xác hơn)
    const isAdmin = authContext.hasRole(ROLE_NAMES.ADMIN, ScopeType.COMPANY);
    return this.divisionService.removeUserDivision(
      user_id,
      currentuser_id,
      isAdmin,
    );
  }


  @Get(':id/members')
  @RequirePermission('division.read')
  @ApiOperation({
    summary: 'Lấy danh sách thành viên của phòng ban',
    description: `
      Lấy danh sách toàn bộ members trong division với thông tin chi tiết.
      
      **Thông tin trả về cho mỗi member:**
      - User info: id, code, name, email, avatar, birthday
      - Position và Level (chức danh và cấp bậc)
      - Team hiện tại (nếu có)
      - Join date và months of service (thâm niên)
      - Skills
      - All role assignments trong division (DIVISION, TEAM, PROJECT scopes)
      
      **Filters hỗ trợ:**
      - search: Tìm theo tên, email, code
      - team_id: Lọc theo team
      - position_id: Lọc theo chức danh
      - level_id: Lọc theo cấp bậc
      - page, limit: Phân trang
      
      **Quyền xem:**
      - Admin: Xem tất cả divisions
      - Division Head: Chỉ xem division mình quản lý
    `,
  })
  @ApiParam({ name: 'id', description: 'Division ID' })
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
              coefficient: { type: 'number' },
              user_role_assignments: {
                type: 'array',
                description:
                  'Danh sách tất cả role assignments của user trong division này',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', example: 1 },
                    role_id: { type: 'number', example: 3 },
                    role_name: { type: 'string', example: 'Member' },
                    scope_type: { type: 'string', example: 'DIVISION' },
                    scope_id: { type: 'number', example: 2 },
                    description: {
                      type: 'string',
                      example: 'Developer chính của phòng',
                    },
                    assigned_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
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
    @GetAuthContext() authContext: AuthorizationContext,
  ) {
    const isAdmin = authContext.hasRole(ROLE_NAMES.ADMIN, ScopeType.COMPANY);
    queryDto.roles = authContext.roleContexts.map((rc) => rc.roleName);
    queryDto.current_user_id = currentuser_id;
    queryDto.is_admin = isAdmin;
    return this.divisionService.getDivisionMembers(id, queryDto);
  }

  @Get(':id/dashboard')
  @RequirePermission('division.read')
  @ApiOperation({
    summary: 'Lấy dữ liệu dashboard cho phòng ban',
    description: `
      Lấy thống kê tổng quan của division cho tháng cụ thể.
      
      **Metrics bao gồm:**
      
      **1. Working Info:**
      - total_members: Tổng số thành viên
      - total_working_days: Tổng số ngày làm việc trong tháng
      - total_ot_hours: Tổng giờ OT
      - total_late_checkins: Tổng số lần check-in trễ
      
      **2. Leave Info:**
      - total_leave_days: Tổng ngày nghỉ phép
      - pending_leave_requests: Số đơn chờ duyệt
      - approved_leave_requests: Số đơn đã duyệt
      
      **3. Project Info:**
      - total_projects: Tổng số dự án
      - active_projects: Dự án đang active
      - completed_projects: Dự án hoàn thành
      
      **Query params:**
      - month: Tháng (default: tháng hiện tại)
      - year: Năm (default: năm hiện tại)
    `,
  })
  @ApiParam({ name: 'id', description: 'Division ID' })
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
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết phòng ban',
    description: `
      Lấy thông tin đầy đủ của một division cụ thể.
      
      **Thông tin trả về:**
      - Thông tin cơ bản: id, name, type, status, address, description
      - Division Head (trưởng phòng)
      - Member count (tổng số thành viên)
      - Team count (tổng số teams)
      - Project count (tổng số projects)
      - Founding date
      
      **Use case:**
      - Xem chi tiết division
      - Lấy thông tin để edit
      - Hiển thị dashboard division
    `,
  })
  @ApiParam({ name: 'id', description: 'Division ID' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết division',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
        type: { type: 'string' },
        status: { type: 'string' },
        address: { type: 'string', nullable: true },
        description: { type: 'string', nullable: true },
        founding_at: { type: 'string', format: 'date-time' },
        division_head: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'number' },
            email: { type: 'string' },
            name: { type: 'string' },
            avatar: { type: 'string' },
          },
        },
        member_count: { type: 'number' },
        team_count: { type: 'number' },
        project_count: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy division',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('division.update')
  @ApiOperation({
    summary: 'Cập nhật thông tin phòng ban',
    description: `
      Cập nhật thông tin của division.
      
      **Có thể cập nhật:**
      - name: Tên division (phải unique)
      - type: Loại division (TECHNICAL, BUSINESS, OPERATIONS, OTHER)
      - status: Trạng thái (ACTIVE, INACTIVE)
      - address: Địa chỉ
      - description: Mô tả
      - founding_at: Ngày thành lập
      
      **Validation:**
      - Tên mới không được trùng với division khác
      
      **Lưu ý:**
      - Division Head không được update ở đây (dùng API assign role riêng)
      - Members và teams không bị ảnh hưởng
    `,
  })
  @ApiParam({ name: 'id', description: 'Division ID' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật division thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string' },
            address: { type: 'string' },
            description: { type: 'string' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Tên đã tồn tại hoặc dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy division',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDivisionDto: UpdateDivisionDto,
  ) {
    return this.divisionService.update(id, updateDivisionDto);
  }

  @Delete(':id')
  @RequirePermission('division.delete')
  @ApiOperation({
    summary: 'Xóa phòng ban',
    description: `
      Xóa mềm (soft delete) division khỏi hệ thống.
      
      **Logic xử lý:**
      1. Kiểm tra division có tồn tại không
      2. Kiểm tra division có members không (không cho xóa nếu có)
      3. Soft delete division (set deleted_at)
      
      **Điều kiện xóa được:**
      - ✅ Division không có members
      
      **Điều kiện KHÔNG xóa được:**
      - ❌ Division có members (cần remove members trước)
      
      **Lưu ý:**
      - Đây là soft delete (có thể khôi phục)
      - Hard delete cần quyền admin và xử lý riêng
    `,
  })
  @ApiParam({ name: 'id', description: 'Division ID' })
  @ApiResponse({
    status: 200,
    description: 'Xóa division thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Xóa division thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            deleted_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa division (có members)',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy division',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.divisionService.remove(id);
  }
}
