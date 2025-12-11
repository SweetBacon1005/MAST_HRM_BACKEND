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
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ScopeType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';

export class CreateSystemRoleDto {
  @ApiProperty({
    description: 'Tên role',
    example: 'system_admin',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả role',
    example: 'Quản trị viên hệ thống',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Danh sách ID permissions',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  permission_ids: number[];
}

export class UpdateSystemRoleDto {
  @ApiPropertyOptional({
    description: 'Tên role',
    example: 'system_admin',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Mô tả role',
    example: 'Quản trị viên hệ thống',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Danh sách ID permissions',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  permission_ids?: number[];
}

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Tên permission',
    example: 'user.create',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả permission',
    example: 'Tạo người dùng mới',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SystemConfigDto {
  @ApiProperty({
    description: 'Key cấu hình',
    example: 'max_login_attempts',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'Giá trị cấu hình',
    example: '5',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({
    description: 'Mô tả cấu hình',
    example: 'Số lần đăng nhập sai tối đa',
  })
  @IsOptional()
  @IsString()
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
  async createRole(@Body() createRoleDto: CreateSystemRoleDto) {
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
    @Body() updateRoleDto: UpdateSystemRoleDto,
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
    const userCount = await this.prisma.user_role_assignment.count({
      where: { role_id: id, deleted_at: null },
    });

    if (userCount > 0) {
      throw new Error(
        `Không thể xóa role đang được sử dụng bởi ${userCount} người dùng`,
      );
    }

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
            position: true,
            level: true,
          },
        },
        // user_division đã bị xóa, sử dụng user_role_assignment thay thế
      },
    });

    // Lấy division names từ user_role_assignment
    const user_ids = users.map((u) => u.id);
    const divisionAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: { in: user_ids },
        scope_type: ScopeType.DIVISION,
        deleted_at: null,
        scope_id: { not: null },
      },
      select: { user_id: true, scope_id: true },
      distinct: ['user_id'],
    });

    const division_ids = [...new Set(divisionAssignments.map((a) => a.scope_id).filter((id): id is number => id !== null))];
    const divisions = await this.prisma.divisions.findMany({
      where: { id: { in: division_ids } },
      select: { id: true, name: true },
    });

    const divisionMap = new Map(divisions.map((d) => [d.id, d.name]));
    const userDivisionMap = new Map<number, string>();
    divisionAssignments.forEach((a) => {
      if (a.scope_id && !userDivisionMap.has(a.user_id)) {
        const divisionName = divisionMap.get(a.scope_id);
        if (divisionName) {
          userDivisionMap.set(a.user_id, divisionName);
        }
      }
    });

    if (format === 'csv') {
      const csvData = users.map((user) => ({
        id: user.id,
        name: user.user_information?.name || '',
        email: user.email,
        division: userDivisionMap.get(user.id) || '',
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
