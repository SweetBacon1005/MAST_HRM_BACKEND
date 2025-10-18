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
import { PrismaService } from '../../database/prisma.service';
import { GetUser } from '../decorators/get-user.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { PermissionService } from '../services/permission.service';
import { RoleHierarchyService } from '../services/role-hierarchy.service';

export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  role_id: number;
  division_id: number;
  position_id: number;
  level_id: number;
}

export class UpdateUserDto {
  name?: string;
  email?: string;
  role_id?: number;
  division_id?: number;
  position_id?: number;
  level_id?: number;
  status?: string;
}

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
          user_information: {
            some: {
              status: 'ACTIVE',
            },
          },
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
            select: { id: true, name: true, email: true },
          },
          subject: {
            select: { id: true, name: true, email: true },
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
            user_information: {
              where: {
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
      user_count: role._count.user_information,
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
            user_division: true,
            projects: {
              where: { deleted_at: null },
            },
            rotation_member: {
              where: { deleted_at: null },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return divisionStats.map((division) => ({
      division_id: division.id,
      division_name: division.name,
      member_count: division._count.user_division,
      project_count: division._count.projects,
      rotation_count: division._count.rotation_member,
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
      where.user_division = {
        some: {
          division: {
            name: { contains: division },
          },
        },
      };
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
              role: {
                select: { id: true, name: true },
              },
              position: {
                select: { id: true, name: true },
              },
              level: {
                select: { id: true, name: true },
              },
            },
          },
          user_division: {
            include: {
              division: {
                select: { id: true, name: true },
              },
              role: {
                select: { id: true, name: true },
              },
            },
          },
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
        totalPages: Math.ceil(total / limit),
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
            role: true,
            position: true,
            level: true,
          },
        },
        user_division: {
          include: {
            division: true,
            role: true,
          },
        },
        rotation_members: {
          where: { deleted_at: null },
          include: {
            division: {
              select: { id: true, name: true },
            },
          },
          orderBy: { created_at: 'desc' },
        },
        user_skills: {
          where: { deleted_at: null },
          include: {
            skill: true,
          },
        },
        contracts: {
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
    @Body() updateUserDto: UpdateUserDto,
    @GetUser('id') adminId: number,
  ) {
    // Kiểm tra quyền sửa role nếu có
    if (updateUserDto.role_id) {
      const targetRole = await this.prisma.roles.findUnique({
        where: { id: updateUserDto.role_id },
      });

      if (targetRole) {
        const canManage = await this.roleHierarchyService.canUserManageUserRole(
          adminId,
          id,
          targetRole.name,
        );

        if (!canManage) {
          throw new Error('Bạn không có quyền gán role này cho user');
        }
      }
    }

    // Cập nhật thông tin cơ bản
    const updatedUser = await this.prisma.users.update({
      where: { id },
      data: {
        name: updateUserDto.name,
        email: updateUserDto.email,
      },
    });

    // Cập nhật user_information nếu có
    if (
      updateUserDto.role_id ||
      updateUserDto.position_id ||
      updateUserDto.level_id ||
      updateUserDto.status
    ) {
      await this.prisma.user_information.updateMany({
        where: { user_id: id },
        data: {
          role_id: updateUserDto.role_id,
          position_id: updateUserDto.position_id,
          level_id: updateUserDto.level_id,
          status: updateUserDto.status as any,
        },
      });
    }

    // Cập nhật user_division nếu có
    if (updateUserDto.division_id) {
      await this.prisma.user_division.updateMany({
        where: { userId: id },
        data: {
          divisionId: updateUserDto.division_id,
        },
      });
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
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') adminId: number,
  ) {
    // Kiểm tra quyền xóa user
    const canManage = await this.roleHierarchyService.canUserManageUserRole(
      adminId,
      id,
    );
    if (!canManage) {
      throw new Error('Bạn không có quyền xóa user này');
    }

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
            user_information: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      ...role,
      permissions: role.permission_role.map((pr) => pr.permission),
      user_count: role._count.user_information,
      hierarchy_info: this.roleHierarchyService.getRoleHierarchy(role.name),
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
    @Query('user_id') userId?: number,
    @Query('event') event?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (userId) {
      where.OR = [{ causer_id: userId }, { subject_id: userId }];
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
            select: { id: true, name: true, email: true },
          },
          subject: {
            select: { id: true, name: true, email: true },
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
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // === BULK OPERATIONS ===

  @Post('bulk/assign-roles')
  @RequirePermission('user.update')
  @ApiOperation({ summary: 'Gán role hàng loạt cho nhiều user' })
  @ApiResponse({
    status: 200,
    description: 'Gán role hàng loạt thành công',
  })
  async bulkAssignRoles(
    @Body() data: { user_ids: number[]; role_id: number },
    @GetUser('id') adminId: number,
  ) {
    const { user_ids, role_id } = data;

    // Kiểm tra role tồn tại
    const role = await this.prisma.roles.findUnique({
      where: { id: role_id },
    });

    if (!role) {
      throw new Error('Role không tồn tại');
    }

    // Kiểm tra quyền gán role này
    const hasPermission =
      await this.roleHierarchyService.hasRoleManagementPermission(
        adminId,
        role.name,
      );

    if (!hasPermission) {
      throw new Error(`Bạn không có quyền gán role ${role.name}`);
    }

    // Thực hiện gán role hàng loạt
    const result = await this.prisma.user_information.updateMany({
      where: {
        user_id: { in: user_ids },
      },
      data: {
        role_id: role_id,
      },
    });

    return {
      message: `Đã gán role ${role.name} cho ${result.count} người dùng`,
      updated_count: result.count,
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
    @Body() data: { user_ids: number[]; division_id: number; type?: number },
    @GetUser('id') adminId: number,
  ) {
    const { user_ids, division_id, type = 1 } = data;

    // Kiểm tra phòng ban tồn tại
    const division = await this.prisma.divisions.findUnique({
      where: { id: division_id, deleted_at: null },
    });

    if (!division) {
      throw new Error('Phòng ban không tồn tại');
    }

    // Thực hiện điều chuyển hàng loạt
    const rotations: any[] = [];
    for (const userId of user_ids) {
      // Kiểm tra quyền điều chuyển từng user
      const canTransfer =
        await this.roleHierarchyService.canApprovePersonnelTransfer(
          adminId,
          userId,
        );

      if (canTransfer) {
        const rotation = await this.prisma.rotation_members.create({
          data: {
            user_id: userId,
            division_id: division_id,
            type: type,
            date_rotation: new Date(),
          },
        });

        // Nếu là điều chuyển vĩnh viễn, cập nhật user_division
        if (type === 1) {
          await this.prisma.user_division.updateMany({
            where: { userId: userId },
            data: { divisionId: division_id },
          });
        }

        rotations.push(rotation);
      }
    }

    return {
      message: `Đã điều chuyển ${rotations.length} người dùng sang ${division.name}`,
      transferred_count: rotations.length,
      rotations,
    };
  }
}
