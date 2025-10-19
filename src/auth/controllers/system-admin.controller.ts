import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import { PrismaService } from '../../database/prisma.service';

export class CreateRoleDto {
  name: string;
  description?: string;
  permission_ids: number[];
}

export class UpdateRoleDto {
  name?: string;
  description?: string;
  permission_ids?: number[];
}

export class CreatePermissionDto {
  name: string;
  description?: string;
}

export class SystemConfigDto {
  key: string;
  value: string;
  description?: string;
}

@ApiTags('system-admin')
@Controller('system-admin')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class SystemAdminController {
  constructor(private readonly prisma: PrismaService) {}

  // === ROLE MANAGEMENT ===

  @Post('roles')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Tạo role mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo role thành công',
  })
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    const { permission_ids, ...roleData } = createRoleDto;

    // Kiểm tra tên role đã tồn tại chưa
    const existingRole = await this.prisma.roles.findFirst({
      where: { name: createRoleDto.name, deleted_at: null },
    });

    if (existingRole) {
      throw new Error('Tên role đã tồn tại');
    }

    // Tạo role mới
    const role = await this.prisma.roles.create({
      data: roleData,
    });

    // Gán permissions cho role
    if (permission_ids && permission_ids.length > 0) {
      const permissionRoleData = permission_ids.map((permissionId) => ({
        role_id: role.id,
        permission_id: permissionId,
      }));

      await this.prisma.permission_role.createMany({
        data: permissionRoleData,
        skipDuplicates: true,
      });
    }

    return {
      message: 'Tạo role thành công',
      role,
    };
  }

  @Patch('roles/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Cập nhật role' })
  @ApiParam({ name: 'id', description: 'ID của role' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật role thành công',
  })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const { permission_ids, ...roleData } = updateRoleDto;

    // Cập nhật thông tin role
    const role = await this.prisma.roles.update({
      where: { id },
      data: roleData,
    });

    // Cập nhật permissions nếu có
    if (permission_ids) {
      // Xóa permissions cũ
      await this.prisma.permission_role.deleteMany({
        where: { role_id: id },
      });

      // Thêm permissions mới
      if (permission_ids.length > 0) {
        const permissionRoleData = permission_ids.map((permissionId) => ({
          role_id: id,
          permission_id: permissionId,
        }));

        await this.prisma.permission_role.createMany({
          data: permissionRoleData,
          skipDuplicates: true,
        });
      }
    }

    return {
      message: 'Cập nhật role thành công',
      role,
    };
  }

  @Delete('roles/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Xóa role' })
  @ApiParam({ name: 'id', description: 'ID của role' })
  @ApiResponse({
    status: 200,
    description: 'Xóa role thành công',
  })
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    // Kiểm tra role có đang được sử dụng không
    const userCount = await this.prisma.user_information.count({
      where: { role_id: id },
    });

    if (userCount > 0) {
      throw new Error(
        `Không thể xóa role đang được sử dụng bởi ${userCount} người dùng`,
      );
    }

    // Xóa role (soft delete)
    await this.prisma.roles.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return {
      message: 'Xóa role thành công',
    };
  }

  // === PERMISSION MANAGEMENT ===

  @Post('permissions')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Tạo permission mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo permission thành công',
  })
  async createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    // Kiểm tra tên permission đã tồn tại chưa
    const existingPermission = await this.prisma.permissions.findFirst({
      where: { name: createPermissionDto.name, deleted_at: null },
    });

    if (existingPermission) {
      throw new Error('Tên permission đã tồn tại');
    }

    const permission = await this.prisma.permissions.create({
      data: createPermissionDto,
    });

    return {
      message: 'Tạo permission thành công',
      permission,
    };
  }

  @Delete('permissions/:id')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Xóa permission' })
  @ApiParam({ name: 'id', description: 'ID của permission' })
  @ApiResponse({
    status: 200,
    description: 'Xóa permission thành công',
  })
  async deletePermission(@Param('id', ParseIntPipe) id: number) {
    // Kiểm tra permission có đang được sử dụng không
    const roleCount = await this.prisma.permission_role.count({
      where: { permission_id: id },
    });

    if (roleCount > 0) {
      throw new Error(
        `Không thể xóa permission đang được sử dụng bởi ${roleCount} role`,
      );
    }

    // Xóa permission (soft delete)
    await this.prisma.permissions.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return {
      message: 'Xóa permission thành công',
    };
  }

  // === SYSTEM MONITORING ===

  @Get('health-check')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Kiểm tra tình trạng hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin tình trạng hệ thống thành công',
  })
  async healthCheck() {
    const startTime = Date.now();

    try {
      // Kiểm tra kết nối database
      await this.prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - startTime;

      // Lấy thông tin database
      const [userCount, divisionCount, projectCount] = await Promise.all([
        this.prisma.users.count(),
        this.prisma.divisions.count(),
        this.prisma.projects.count(),
      ]);

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          response_time_ms: dbResponseTime,
        },
        statistics: {
          total_users: userCount,
          total_divisions: divisionCount,
          total_projects: projectCount,
        },
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('database-stats')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Thống kê database' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê database thành công',
  })
  async getDatabaseStats() {
    const tables = [
      'users',
      'divisions',
      'projects',
      'roles',
      'permissions',
      'rotation_members',
      'user_division',
      'time_sheets',
      'attendance_logs',
      'remote_work_requests',
      'over_times_history',
      'day_offs',
    ];

    const stats = {};

    for (const table of tables) {
      try {
        const count = await this.prisma[table].count();
        stats[table] = count;
      } catch (error) {
        stats[table] = 'Error: ' + error.message;
      }
    }

    return {
      table_counts: stats,
      generated_at: new Date().toISOString(),
    };
  }

  // === DATA CLEANUP ===

  @Post('cleanup/soft-deleted')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Dọn dẹp dữ liệu đã xóa mềm (cẩn thận!)' })
  @ApiResponse({
    status: 200,
    description: 'Dọn dẹp dữ liệu thành công',
  })
  async cleanupSoftDeleted(@Query('confirm') confirm: string) {
    if (confirm !== 'YES_I_UNDERSTAND') {
      throw new Error(
        'Vui lòng xác nhận bằng cách thêm ?confirm=YES_I_UNDERSTAND',
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Xóa dữ liệu soft delete cũ hơn 30 ngày

    const results = {};

    // Dọn dẹp users
    const deletedUsers = await this.prisma.users.deleteMany({
      where: {
        deleted_at: {
          not: null,
          lt: cutoffDate,
        },
      },
    });
    results['users'] = deletedUsers.count;

    // Dọn dẹp divisions
    const deletedDivisions = await this.prisma.divisions.deleteMany({
      where: {
        deleted_at: {
          not: null,
          lt: cutoffDate,
        },
      },
    });
    results['divisions'] = deletedDivisions.count;

    // Dọn dẹp rotation_members
    const deletedRotations = await this.prisma.rotation_members.deleteMany({
      where: {
        deleted_at: {
          not: null,
          lt: cutoffDate,
        },
      },
    });
    results['rotation_members'] = deletedRotations.count;

    return {
      message: 'Dọn dẹp dữ liệu thành công',
      deleted_records: results,
      cutoff_date: cutoffDate.toISOString(),
    };
  }

  // === BACKUP & EXPORT ===

  @Get('export/users')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Xuất danh sách người dùng' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'], required: false })
  @ApiResponse({
    status: 200,
    description: 'Xuất dữ liệu thành công',
  })
  async exportUsers(@Query('format') format: string = 'json') {
    const users = await this.prisma.users.findMany({
      where: { deleted_at: null },
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
          },
        },
      },
    });

    if (format === 'csv') {
      // Chuyển đổi sang CSV format (đơn giản)
      const csvData = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.user_information?.[0]?.role?.name || '',
        division: user.user_division?.[0]?.division?.name || '',
        created_at: user.created_at,
      }));

      return {
        format: 'csv',
        data: csvData,
        count: csvData.length,
      };
    }

    return {
      format: 'json',
      data: users,
      count: users.length,
      exported_at: new Date().toISOString(),
    };
  }

  @Get('export/system-config')
  @RequirePermission('system.admin')
  @ApiOperation({ summary: 'Xuất cấu hình hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Xuất cấu hình thành công',
  })
  async exportSystemConfig() {
    const [roles, permissions, divisions] = await Promise.all([
      this.prisma.roles.findMany({
        where: { deleted_at: null },
        include: {
          permission_role: {
            include: {
              permission: true,
            },
          },
        },
      }),
      this.prisma.permissions.findMany({
        where: { deleted_at: null },
      }),
      this.prisma.divisions.findMany({
        where: { deleted_at: null },
      }),
    ]);

    return {
      roles,
      permissions,
      divisions,
      exported_at: new Date().toISOString(),
      version: '1.0',
    };
  }
}
