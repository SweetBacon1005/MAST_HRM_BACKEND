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
import { RotationType, ScopeType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GetCurrentUser } from '../decorators/get-current-user.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { PermissionService } from '../services/permission.service';
import { RoleHierarchyService } from '../services/role-hierarchy.service';

export class SystemStatsDto {
  total_users: number;
  active_users: number;
  total_divisions: number;
  total_projects: number;
  pending_requests: number;
  recent_activities: any[];
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleHierarchyService: RoleHierarchyService,
    private readonly permissionService: PermissionService,
  ) {}

  // === DASHBOARD & STATISTICS ===

  @Get('dashboard/stats')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Lấy thống kê tổng quan hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê thành công',
  })
  async getDashboardStats(): Promise<SystemStatsDto> {
    const [
      totalUsers,
      activeUsers,
      totalDivisions,
      totalProjects,
      pendingRequests,
      recentActivities,
    ] = await Promise.all([
      // Tổng số người dùng
      this.prisma.users.count({
        where: { deleted_at: null },
      }),
      // Người dùng đang hoạt động
      this.prisma.users.count({
        where: {
          deleted_at: null,
        },
      }),
      // Tổng số phòng ban
      this.prisma.divisions.count({
        where: { deleted_at: null },
      }),
      // Tổng số dự án
      this.prisma.projects.count({
        where: { deleted_at: null },
      }),
      // Đơn yêu cầu đang chờ
      this.prisma.remote_work_requests.count({
        where: { status: 'PENDING' },
      }),
      // Hoạt động gần đây
      this.prisma.activity_log.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          causer: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                },
              },
            },
          },
          subject: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total_users: totalUsers,
      active_users: activeUsers,
      total_divisions: totalDivisions,
      total_projects: totalProjects,
      pending_requests: pendingRequests,
      recent_activities: recentActivities,
    };
  }

  @Get('dashboard/user-stats')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Thống kê người dùng theo vai trò' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê người dùng thành công',
  })
  async getUserStatsByRole() {
    const userStats = await this.prisma.roles.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            user_role_assignment: {
              where: {
                deleted_at: null,
                user: {
                  deleted_at: null,
                },
              },
            },
          },
        },
      },
    });

    return userStats.map((role) => ({
      role_name: role.name,
      user_count: role._count.user_role_assignment,
    }));
  }

  @Get('dashboard/division-stats')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Thống kê phòng ban và nhân sự' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê phòng ban thành công',
  })
  async getDivisionStats() {
    const divisionStats = await this.prisma.divisions.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            projects: {
              where: { deleted_at: null },
            },
            from_division: {
              where: { deleted_at: null },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const memberCounts = await Promise.all(
      divisionStats.map(async (division) => {
        const assignments = await this.prisma.user_role_assignment.findMany({
          where: {
            scope_type: 'DIVISION',
            scope_id: division.id,
            deleted_at: null,
          },
          select: { user_id: true },
          distinct: ['user_id'],
        });
        return { division_id: division.id, count: assignments.length };
      }),
    );

    const memberCountMap = new Map(
      memberCounts.map((mc) => [mc.division_id, mc.count]),
    );

    return divisionStats.map((division) => ({
      division_id: division.id,
      division_name: division.name,
      member_count: memberCountMap.get(division.id) || 0,
      project_count: division._count.projects,
      rotation_count: division._count.from_division,
    }));
  }

  // === USER MANAGEMENT ===

  @Get('users')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy danh sách tất cả người dùng (Admin)' })
  @ApiQuery({ name: 'page', required: false, description: 'Số trang' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng mỗi trang',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm kiếm theo tên/email',
  })
  @ApiQuery({ name: 'role', required: false, description: 'Lọc theo vai trò' })
  @ApiQuery({
    name: 'division',
    required: false,
    description: 'Lọc theo phòng ban',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Lọc theo trạng thái',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách người dùng thành công',
  })
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('division') division?: string,
    @Query('status') status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { deleted_at: null };

    // Tìm kiếm theo tên hoặc email
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Lọc theo vai trò
    if (role) {
      where.user_information = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }

    // Lọc theo phòng ban
    if (division) {
      // Tìm division IDs theo tên
      const divisions = await this.prisma.divisions.findMany({
        where: {
          name: { contains: division },
          deleted_at: null,
        },
        select: { id: true },
      });
      const division_ids = divisions.map((d) => d.id);
      if (division_ids.length > 0) {
        // Lấy user IDs từ user_role_assignment
        const assignments = await this.prisma.user_role_assignment.findMany({
          where: {
            scope_type: ScopeType.DIVISION,
            scope_id: { in: division_ids },
            deleted_at: null,
          },
          select: { user_id: true },
          distinct: ['user_id'],
        });
        const user_ids = assignments.map((a) => a.user_id);
        where.id = { in: user_ids };
      } else {
        // Không tìm thấy division nào, trả về empty
        where.id = { in: [] };
      }
    }

    // Lọc theo trạng thái
    if (status) {
      where.user_information = {
        ...where.user_information,
        some: {
          ...where.user_information?.some,
          status: status,
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user_information: {
            include: {
              position: {
                select: { id: true, name: true },
              },
            },
          },
          // user_division đã bị xóa, sử dụng user_role_assignment thay thế
        },
      }),
      this.prisma.users.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  @Get('users/:id')
  @RequirePermission('user.read')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết người dùng' })
  @ApiParam({ name: 'id', description: 'ID người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin người dùng thành công',
  })
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.prisma.users.findUnique({
      where: { id, deleted_at: null },
      include: {
        user_information: {
          include: {
            position: true,
            education: true,
            experience: true,
            user_skills: true,
            language: true,
          },
        },
        user_role_assignments: {
          where: { deleted_at: null },
          include: {
            role: true,
          },
        },
        rotation_members: {
          where: { deleted_at: null },
          include: {
            to_division: {
              select: { id: true, name: true },
            },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    return user;
  }

  @Patch('users/:id')
  @RequirePermission('user.update')
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng (Admin)' })
  @ApiParam({ name: 'id', description: 'ID người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật người dùng thành công',
  })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: AdminUpdateUserDto,
    @GetCurrentUser('id') adminId: number,
  ) {
    const updatedUser = await this.prisma.users.update({
      where: { id },
      data: {
        email: updateUserDto.email,
      },
      include: {
        user_information: true,
      },
    });

    if (updateUserDto.name || updateUserDto.position_id) {
      const user = await this.prisma.users.findUnique({
        where: { id },
        include: { user_information: true },
      });

      if (user?.user_information) {
        await this.prisma.user_information.update({
          where: { id: user.user_information.id },
          data: {
            name: updateUserDto.name,
            position_id: updateUserDto.position_id,
          },
        });
      }
    }

    if (updateUserDto.division_id) {
      await this.prisma.user_role_assignment.updateMany({
        where: {
          user_id: id,
          scope_type: ScopeType.DIVISION,
          deleted_at: null,
        },
        data: {
          deleted_at: new Date(),
        },
      });
      const employeeRole = await this.prisma.roles.findFirst({
        where: { name: 'employee', deleted_at: null },
      });
      if (employeeRole) {
        await this.prisma.user_role_assignment.create({
          data: {
            user_id: id,
            role_id: employeeRole.id,
            scope_type: ScopeType.DIVISION,
            scope_id: updateUserDto.division_id,
            assigned_by: id, // Tạm thời dùng chính user đó
          },
        });
      }
    }

    return {
      message: 'Cập nhật người dùng thành công',
      user: updatedUser,
    };
  }

  @Delete('users/:id')
  @RequirePermission('user.delete')
  @ApiOperation({ summary: 'Xóa người dùng (Soft delete)' })
  @ApiParam({ name: 'id', description: 'ID người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Xóa người dùng thành công',
  })
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.users.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return {
      message: 'Xóa người dùng thành công',
    };
  }

  // === SYSTEM MANAGEMENT ===

  @Get('system/permissions')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Lấy danh sách tất cả permissions' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách permissions thành công',
  })
  async getAllPermissions() {
    const permissions = await this.prisma.permissions.findMany({
      where: { deleted_at: null },
      orderBy: { name: 'asc' },
    });

    // Nhóm permissions theo category
    const groupedPermissions = permissions.reduce(
      (acc, permission) => {
        const [category] = permission.name.split('.');
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(permission);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    return {
      permissions,
      grouped: groupedPermissions,
    };
  }

  @Get('system/roles')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Lấy danh sách tất cả roles với permissions' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách roles thành công',
  })
  async getAllRoles() {
    const roles = await this.prisma.roles.findMany({
      where: { deleted_at: null },
      include: {
        permission_role: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            user_role_assignment: {
              where: { deleted_at: null },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      ...role,
      permissions: role.permission_role.map((pr) => pr.permission),
      user_count: role._count.user_role_assignment,
    }));
  }

  @Get('system/activity-logs')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Lấy nhật ký hoạt động hệ thống' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({ name: 'event', required: false })
  @ApiResponse({
    status: 200,
    description: 'Lấy nhật ký hoạt động thành công',
  })
  async getActivityLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('user_id') user_id?: number,
    @Query('event') event?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (user_id) {
      where.OR = [{ causer_id: user_id }, { subject_id: user_id }];
    }

    if (event) {
      where.event = { contains: event };
    }

    const [logs, total] = await Promise.all([
      this.prisma.activity_log.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          causer: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                },
              },
            },
          },
          subject: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.activity_log.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  @Post('bulk/transfer-division')
  @RequirePermission('personnel.transfer.create')
  @ApiOperation({
    summary: 'Điều chuyển hàng loạt nhiều user sang phòng ban khác',
  })
  @ApiResponse({
    status: 200,
    description: 'Điều chuyển hàng loạt thành công',
  })
  async bulkTransferDivision(
    @Body()
    data: { user_ids: number[]; division_id: number; type?: RotationType },
    @GetCurrentUser('id') adminId: number,
  ) {
    const { user_ids, division_id, type = RotationType.TEMPORARY } = data;

    const [division, users, employeeRole, currentAssignments] =
      await Promise.all([
        this.prisma.divisions.findUnique({
          where: { id: division_id, deleted_at: null },
          select: { id: true, name: true },
        }),
        this.prisma.users.findMany({
          where: {
            id: { in: user_ids },
            deleted_at: null,
          },
          select: { id: true },
        }),
        this.prisma.roles.findFirst({
          where: { name: 'employee', deleted_at: null },
          select: { id: true },
        }),
        this.prisma.user_role_assignment.findMany({
          where: {
            user_id: { in: user_ids },
            scope_type: ScopeType.DIVISION,
            deleted_at: null,
            scope_id: { not: null },
          },
          select: { user_id: true, scope_id: true },
        }),
      ]);

    if (!division) {
      throw new Error('Phòng ban không tồn tại');
    }

    if (users.length === 0) {
      throw new Error('Không có user nào hợp lệ để điều chuyển');
    }

    if (!employeeRole) {
      throw new Error('Không tìm thấy role employee');
    }

    const fromIdMap = new Map<number, number>();
    currentAssignments.forEach((assignment) => {
      if (assignment.scope_id && !fromIdMap.has(assignment.user_id)) {
        fromIdMap.set(assignment.user_id, assignment.scope_id);
      }
    });

    const validuser_ids = users
      .map((u) => u.id)
      .filter((user_id) => fromIdMap.has(user_id));

    if (validuser_ids.length === 0) {
      throw new Error(
        'Không có user nào có division assignment để điều chuyển',
      );
    }

    const now = new Date();

    // Thực hiện tất cả operations trong transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Tạo rotation records
      const rotations = await tx.rotation_members.createMany({
        data: validuser_ids.map((user_id) => ({
          user_id: user_id,
          from_id: fromIdMap.get(user_id)!,
          to_id: division_id,
          type: type,
          date_rotation: now,
        })),
      });

      // Xóa assignments cũ
      await tx.user_role_assignment.updateMany({
        where: {
          user_id: { in: validuser_ids },
          scope_type: ScopeType.DIVISION,
          deleted_at: null,
        },
        data: {
          deleted_at: now,
        },
      });

      // Tạo assignments mới
      await tx.user_role_assignment.createMany({
        data: validuser_ids.map((user_id) => ({
          user_id: user_id,
          role_id: employeeRole.id,
          scope_type: ScopeType.DIVISION,
          scope_id: division_id,
          assigned_by: adminId,
        })),
      });

      // Lấy rotation records đã tạo để trả về
      const createdRotations = await tx.rotation_members.findMany({
        where: {
          user_id: { in: validuser_ids },
          to_id: division_id,
          date_rotation: now,
        },
        orderBy: { id: 'asc' },
      });

      return createdRotations;
    });

    return {
      message: `Đã điều chuyển ${result.length} người dùng sang ${division.name}`,
      transferred_count: result.length,
      rotations: result,
    };
  }
}
