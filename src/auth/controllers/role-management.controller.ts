import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { GetUser } from '../decorators/get-user.decorator';
import { RoleHierarchyService } from '../services/role-hierarchy.service';
import { PermissionService } from '../services/permission.service';
import { PrismaService } from '../../database/prisma.service';

export class AssignRoleDto {
  userId: number;
  roleId: number;
  roleName: string;
}

@ApiTags('role-management')
@Controller('role-management')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class RoleManagementController {
  constructor(
    private readonly roleHierarchyService: RoleHierarchyService,
    private readonly permissionService: PermissionService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('assignable-roles')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy danh sách roles có thể gán cho người khác' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách roles thành công',
  })
  async getAssignableRoles(@GetUser('id') userId: number) {
    const assignableRoleNames =
      await this.roleHierarchyService.getAssignableRoles(userId);

    // Lấy thông tin chi tiết của các roles
    const roles = await this.prisma.roles.findMany({
      where: {
        name: { in: assignableRoleNames },
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      assignableRoles: roles,
      hierarchy: this.roleHierarchyService.getAllRolesByHierarchy(),
    };
  }

  @Get('user/:userId/manageable')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Kiểm tra có thể quản lý role của user không' })
  @ApiParam({ name: 'userId', description: 'ID của user cần kiểm tra' })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra thành công',
  })
  async canManageUserRole(
    @Param('userId', ParseIntPipe) targetUserId: number,
    @GetUser('id') managerId: number,
  ) {
    const canManage = await this.roleHierarchyService.canUserManageUserRole(
      managerId,
      targetUserId,
    );

    const targetRole = await this.permissionService.getUserRole(targetUserId);
    const managerRole = await this.permissionService.getUserRole(managerId);

    return {
      canManage,
      targetUser: {
        id: targetUserId,
        currentRole: targetRole,
      },
      manager: {
        id: managerId,
        role: managerRole,
      },
    };
  }

  @Post('assign-role')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Gán role cho user (với kiểm tra phân cấp)' })
  @ApiResponse({
    status: 200,
    description: 'Gán role thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền gán role này',
  })
  async assignRole(
    @Body() assignRoleDto: AssignRoleDto,
    @GetUser('id') managerId: number,
  ) {
    const { userId, roleId, roleName } = assignRoleDto;

    // Kiểm tra role tồn tại
    const role = await this.prisma.roles.findUnique({
      where: { id: roleId, deleted_at: null },
    });

    if (!role || role.name !== roleName) {
      throw new ForbiddenException('Role không tồn tại hoặc không hợp lệ');
    }

    // Kiểm tra quyền quản lý role
    const canManage = await this.roleHierarchyService.canUserManageUserRole(
      managerId,
      userId,
      roleName,
    );

    if (!canManage) {
      throw new ForbiddenException('Bạn không có quyền gán role này cho user');
    }

    // Kiểm tra permission cụ thể cho role
    const hasRolePermission =
      await this.roleHierarchyService.hasRoleManagementPermission(
        managerId,
        roleName,
      );

    if (!hasRolePermission) {
      throw new ForbiddenException(
        `Bạn không có quyền quản lý role ${roleName}`,
      );
    }

    // Cập nhật role trong user_information
    const updated = await this.prisma.user_information.updateMany({
      where: { user_id: userId },
      data: { role_id: roleId },
    });

    if (updated.count === 0) {
      throw new ForbiddenException('Không thể cập nhật role cho user');
    }

    // Lấy thông tin user sau khi cập nhật
    const updatedUser = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_information: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      message: 'Gán role thành công',
      user: {
        id: updatedUser?.id,
        name: updatedUser?.name,
        role: updatedUser?.user_information?.[0]?.role,
      },
    };
  }

  @Get('hierarchy')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy thông tin phân cấp roles' })
  @ApiResponse({
    status: 200,
    description: 'Lấy phân cấp roles thành công',
  })
  getHierarchy() {
    return {
      hierarchy: this.roleHierarchyService.getAllRolesByHierarchy(),
    };
  }

  @Get('user/:userId/role-options')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy danh sách roles có thể gán cho user cụ thể' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách roles thành công',
  })
  async getRoleOptionsForUser(
    @Param('userId', ParseIntPipe) targetUserId: number,
    @GetUser('id') managerId: number,
  ) {
    // Kiểm tra có thể quản lý user này không
    const canManage = await this.roleHierarchyService.canUserManageUserRole(
      managerId,
      targetUserId,
    );

    if (!canManage) {
      throw new ForbiddenException('Bạn không có quyền quản lý user này');
    }

    // Lấy danh sách roles có thể gán
    const assignableRoleNames =
      await this.roleHierarchyService.getAssignableRoles(managerId);

    const roles = await this.prisma.roles.findMany({
      where: {
        name: { in: assignableRoleNames },
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Lấy role hiện tại của user
    const currentRole = await this.permissionService.getUserRole(targetUserId);

    return {
      availableRoles: roles,
      currentRole,
      canManage,
    };
  }

  @Get('rotation-member/:rotationId/can-manage')
  @RequirePermission('personnel.transfer.read')
  @ApiOperation({
    summary: 'Kiểm tra có thể quản lý điều chuyển nhân sự không',
  })
  @ApiParam({ name: 'rotationId', description: 'ID của điều chuyển' })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra thành công',
  })
  async canManageRotationMember(
    @Param('rotationId', ParseIntPipe) rotationId: number,
    @GetUser('id') managerId: number,
  ) {
    // Lấy thông tin điều chuyển
    const rotation = await this.prisma.rotation_members.findUnique({
      where: { id: rotationId, deleted_at: null },
      select: { user_id: true },
    });

    if (!rotation) {
      throw new ForbiddenException('Không tìm thấy điều chuyển');
    }

    const canManage =
      await this.roleHierarchyService.canApprovePersonnelTransfer(
        managerId,
        rotation.user_id,
      );

    return {
      canManage,
      rotationId,
      managerId,
    };
  }
}
