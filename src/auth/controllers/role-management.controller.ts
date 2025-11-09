import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import {
  ACTIVE_PROJECT_STATUSES,
  PROJECT_POSITIONS,
  ROLE_NAMES,
} from '../constants/role.constants';
import { GetCurrentUser } from '../decorators/get-current-user.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { UpdateUserRoleDto } from '../dto/role-management.dto';
import {
  UnifiedRoleAssignmentDto,
  UnifiedRoleAssignmentResponseDto,
} from '../dto/unified-role-assignment.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { PermissionService } from '../services/permission.service';
import { RoleAssignmentService } from '../services/role-assignment.service';
import { RoleHierarchyService } from '../services/role-hierarchy.service';

@ApiTags('role-management')
@Controller('role-management')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class RoleManagementController {
  constructor(
    private readonly roleHierarchyService: RoleHierarchyService,
    private readonly permissionService: PermissionService,
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== UNIFIED ROLE ASSIGNMENT API ====================

  @Post('assign-unified')
  @RequirePermission('role.update')
  @ApiOperation({
    summary: 'API thống nhất gán role cho user',
    description:
      'Gán role cho một hoặc nhiều user với logic nghiệp vụ đầy đủ. Thay thế tất cả các API gán role riêng lẻ.',
  })
  @ApiBody({ type: UnifiedRoleAssignmentDto })
  @ApiResponse({
    status: 200,
    description: 'Gán role thành công',
    type: UnifiedRoleAssignmentResponseDto,
    schema: {
      example: {
        success: true,
        results: [
          {
            userId: 123,
            success: true,
            message: 'Gán PM thành công cho project ABC',
            user: {
              id: 123,
              name: 'Nguyễn Văn A',
              email: 'a.nguyen@company.com',
              role: {
                id: 4,
                name: 'project_manager',
              },
            },
            context: {
              project: {
                id: 10,
                name: 'Project ABC',
                code: 'ABC001',
              },
            },
            replacedUser: {
              id: 456,
              name: 'Nguyễn Văn B',
              email: 'b.nguyen@company.com',
            },
          },
        ],
        summary: {
          total: 1,
          successful: 1,
          failed: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ hoặc thiếu context yêu cầu',
    schema: {
      example: {
        statusCode: 400,
        message: 'Role project_manager yêu cầu projectId',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền gán role này',
    schema: {
      example: {
        statusCode: 403,
        message: 'Bạn không có quyền gán role project_manager',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy role, user, project, team hoặc division',
  })
  async assignRoleUnified(
    @Body() dto: UnifiedRoleAssignmentDto,
    @GetCurrentUser('id') managerId: number,
  ): Promise<UnifiedRoleAssignmentResponseDto> {
    if (!dto.targetUserId || dto.targetUserId.length === 0) {
      throw new BadRequestException('Cần ít nhất một user để gán role');
    }

    if (!dto.roleId) {
      throw new BadRequestException('Role ID là bắt buộc');
    }

    await this.validateAssignmentPermission(managerId, dto.roleId, dto);

    const result = await this.roleAssignmentService.assignRoleUnified(
      dto.targetUserId,
      dto.roleId,
      managerId,
      {
        projectId: dto.context?.projectId,
        teamId: dto.context?.teamId,
        divisionId: dto.context?.divisionId,
      }
    );

    // Format response
    const formattedResults = await Promise.all(
      result.results.map(async (r: any) => {
        if (r.success) {
          const user = await this.prisma.users.findUnique({
            where: { id: r.userId },
            select: {
              id: true,
              email: true,
              user_information: {
                select: { name: true }
              }
            }
          });

          const role = await this.prisma.roles.findUnique({
            where: { id: dto.roleId },
            select: { id: true, name: true }
          });

          return {
            userId: r.userId,
            success: true,
            message: this.getSuccessMessage(role?.name || '', dto.context),
            user: {
              id: user?.id || 0,
              name: user?.user_information?.[0]?.name || '',
              email: user?.email || '',
              role: role || { id: 0, name: '' }
            },
            context: await this.getContextInfo(dto.context),
            replacedUser: r.replacedUser ? {
              id: r.replacedUser.id,
              name: r.replacedUser.user_information?.name,
              email: r.replacedUser.email
            } : undefined
          };
        } else {
          return {
            userId: r.userId,
            success: false,
            message: r.error || 'Có lỗi xảy ra khi gán role'
          };
        }
      })
    );

    return {
      success: result.summary.failed === 0,
      results: formattedResults,
      summary: result.summary
    };
  }

  // ==================== READ-ONLY ENDPOINTS ====================

  @Get('assignable-roles')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy danh sách roles có thể gán cho người khác' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách roles thành công',
  })
  async getAssignableRoles(@GetCurrentUser('id') userId: number) {
    const userRoles = await this.roleAssignmentService.getUserRoles(userId);
    if (!userRoles || userRoles.roles.length === 0) {
      return {
        assignableRoles: [],
        hierarchy: this.roleHierarchyService.getAllRolesByHierarchy(),
        userRole: null,
      };
    }

    const userRoleNames = userRoles.roles.map(r => r.name);
    const highestRole = this.getHighestRole(userRoleNames);
    
    let assignableRoleNames: string[] = [];

    if (this.isHighLevelRole(highestRole)) {
      assignableRoleNames = [
        ROLE_NAMES.DIVISION_HEAD,
        ROLE_NAMES.PROJECT_MANAGER,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.EMPLOYEE,
        ROLE_NAMES.HR_MANAGER,
      ];
    } else if (highestRole === ROLE_NAMES.DIVISION_HEAD) {
      assignableRoleNames = [
        ROLE_NAMES.PROJECT_MANAGER,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.EMPLOYEE,
      ];
    } else {
      assignableRoleNames = [];
    }

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
      userRole: {
        id: userRoles.roles[0]?.id,
        name: highestRole,
      },
      restrictions: this.getRestrictions(highestRole),
    };
  }

  private getRestrictions(roleName: string) {
    switch (roleName) {
      case ROLE_NAMES.DIVISION_HEAD:
        return {
          scope: 'division_only',
          message: 'Chỉ có thể gán role cho nhân viên trong cùng phòng ban',
          allowedRoles: [
            ROLE_NAMES.PROJECT_MANAGER,
            ROLE_NAMES.TEAM_LEADER,
            ROLE_NAMES.EMPLOYEE,
          ],
        };
      case ROLE_NAMES.SUPER_ADMIN:
      case ROLE_NAMES.ADMIN:
      case ROLE_NAMES.COMPANY_OWNER:
        return {
          scope: 'company_wide',
          message: 'Có thể gán role cho tất cả nhân viên trong công ty',
        };
      default:
        return {
          scope: 'none',
          message: 'Không có quyền gán role',
        };
    }
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
    @GetCurrentUser('id') managerId: number,
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
    @GetCurrentUser('id') managerId: number,
  ) {
    // Kiểm tra quyền quản lý user
    const canManage = await this.canManageUser(managerId, targetUserId);

    if (!canManage) {
      throw new ForbiddenException('Bạn không có quyền quản lý user này');
    }

    // Lấy roles có thể gán
    const managerRoles = await this.roleAssignmentService.getUserRoles(managerId);
    const managerRoleNames = managerRoles.roles.map(r => r.name);
    const highestManagerRole = this.getHighestRole(managerRoleNames);
    
    let assignableRoleNames: string[] = [];

    if (this.isHighLevelRole(highestManagerRole)) {
      assignableRoleNames = [
        ROLE_NAMES.DIVISION_HEAD,
        ROLE_NAMES.PROJECT_MANAGER,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.EMPLOYEE,
        ROLE_NAMES.HR_MANAGER,
      ];
    } else if (highestManagerRole === ROLE_NAMES.DIVISION_HEAD) {
      assignableRoleNames = [
        ROLE_NAMES.PROJECT_MANAGER,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.EMPLOYEE,
      ];
    }

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

    // Lấy role hiện tại của target user
    const targetUserRoles = await this.roleAssignmentService.getUserRoles(targetUserId);
    const currentRole = targetUserRoles.roles.length > 0 ? {
      id: targetUserRoles.roles[0].id,
      name: this.getHighestRole(targetUserRoles.roles.map(r => r.name))
    } : null;

    return {
      availableRoles: roles,
      currentRole,
      canManage,
      restrictions: this.getRestrictions(highestManagerRole),
    };
  }

  /**
   * Kiểm tra có thể quản lý user không
   */
  private async canManageUser(managerId: number, targetUserId: number): Promise<boolean> {
    if (managerId === targetUserId) return false;

    const managerRoles = await this.roleAssignmentService.getUserRoles(managerId);
    const managerRoleNames = managerRoles.roles.map(r => r.name);
    const highestManagerRole = this.getHighestRole(managerRoleNames);

    // High-level roles có thể quản lý tất cả
    if (this.isHighLevelRole(highestManagerRole)) {
      return true;
    }

    // Division head chỉ quản lý trong division của mình
    if (highestManagerRole === ROLE_NAMES.DIVISION_HEAD) {
      return await this.isUserInSameDivision(managerId, targetUserId);
    }

    return false;
  }

  /**
   * Kiểm tra user có trong cùng division không
   */
  private async isUserInSameDivision(managerId: number, targetUserId: number): Promise<boolean> {
    const managerDivision = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: managerId,
        role: {
          name: ROLE_NAMES.DIVISION_HEAD,
          deleted_at: null
        },
        deleted_at: null
      },
      select: { scope_id: true }
    });

    if (!managerDivision?.scope_id) return false;

    const targetDivision = await this.prisma.user_division.findFirst({
      where: {
        userId: targetUserId,
        deleted_at: null
      },
      select: { divisionId: true }
    });

    return targetDivision?.divisionId === managerDivision.scope_id;
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
    @GetCurrentUser('id') managerId: number,
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

  // ==================== HELPER METHODS ====================

  /**
   * Validate quyền gán role
   */
  private async validateAssignmentPermission(
    managerId: number,
    roleId: number,
    dto: UnifiedRoleAssignmentDto
  ) {
    const managerRoles = await this.roleAssignmentService.getUserRoles(managerId);
    const targetRole = await this.prisma.roles.findUnique({
      where: { id: roleId, deleted_at: null },
      select: { name: true }
    });

    if (!targetRole) {
      throw new NotFoundException('Role không tồn tại');
    }

    const managerRoleNames = managerRoles.roles.map(r => r.name);
    const highestManagerRole = this.getHighestRole(managerRoleNames);

    // Kiểm tra quyền theo hierarchy
    if (this.isHighLevelRole(highestManagerRole)) {
      // Admin, super_admin, company_owner có thể gán tất cả roles
      return;
    }

    if (highestManagerRole === ROLE_NAMES.DIVISION_HEAD) {
      // Division head chỉ có thể gán PM, team_leader, employee
      const allowedRoles = [
        ROLE_NAMES.PROJECT_MANAGER,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.EMPLOYEE
      ];

      if (!allowedRoles.includes(targetRole.name as any)) {
        throw new ForbiddenException(
          `Division Head không thể gán role ${targetRole.name}`
        );
      }

      // Kiểm tra scope - division head chỉ gán trong division của mình
      await this.validateDivisionScope(managerId, dto);
    } else {
      throw new ForbiddenException('Bạn không có quyền gán role này');
    }
  }

  /**
   * Kiểm tra scope division
   */
  private async validateDivisionScope(managerId: number, dto: UnifiedRoleAssignmentDto) {
    // Lấy division của manager
    const managerDivision = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: managerId,
        role: {
          name: ROLE_NAMES.DIVISION_HEAD,
          deleted_at: null
        },
        deleted_at: null
      },
      select: { scope_id: true }
    });

    if (!managerDivision?.scope_id) {
      throw new ForbiddenException('Không tìm thấy division của bạn');
    }

    // Kiểm tra tất cả target users có trong cùng division không
    for (const userId of dto.targetUserId) {
      const userDivision = await this.prisma.user_division.findFirst({
        where: {
          userId: userId,
          deleted_at: null
        },
        select: { divisionId: true }
      });

      if (userDivision?.divisionId !== managerDivision.scope_id) {
        throw new ForbiddenException(
          `User ${userId} không thuộc division của bạn`
        );
      }
    }
  }

  /**
   * Kiểm tra role cấp cao
   */
  private isHighLevelRole(roleName: string): boolean {
    return [
      ROLE_NAMES.SUPER_ADMIN,
      ROLE_NAMES.ADMIN,
      ROLE_NAMES.COMPANY_OWNER
    ].includes(roleName as any);
  }

  /**
   * Lấy role cao nhất từ danh sách
   */
  private getHighestRole(roleNames: string[]): string {
    if (!roleNames || roleNames.length === 0) return ROLE_NAMES.EMPLOYEE;

    return roleNames.reduce((highest, current) => {
      const currentLevel = this.getRoleLevel(current);
      const highestLevel = this.getRoleLevel(highest);
      return currentLevel > highestLevel ? current : highest;
    });
  }

  /**
   * Lấy level của role
   */
  private getRoleLevel(roleName: string): number {
    const hierarchy = {
      [ROLE_NAMES.SUPER_ADMIN]: 100,
      [ROLE_NAMES.ADMIN]: 90,
      [ROLE_NAMES.COMPANY_OWNER]: 80,
      [ROLE_NAMES.HR_MANAGER]: 70,
      [ROLE_NAMES.DIVISION_HEAD]: 60,
      [ROLE_NAMES.PROJECT_MANAGER]: 50,
      [ROLE_NAMES.TEAM_LEADER]: 40,
      [ROLE_NAMES.EMPLOYEE]: 10,
    };
    return hierarchy[roleName] || 0;
  }

  /**
   * Tạo success message
   */
  private getSuccessMessage(roleName: string, context?: any): string {
    switch (roleName) {
      case ROLE_NAMES.PROJECT_MANAGER:
        return `Gán PM thành công cho project ${context?.projectId || ''}`;
      case ROLE_NAMES.TEAM_LEADER:
        return `Gán Team Leader thành công cho team ${context?.teamId || ''}`;
      case ROLE_NAMES.DIVISION_HEAD:
        return `Gán Division Head thành công cho division ${context?.divisionId || ''}`;
      default:
        return `Gán role ${roleName as any} thành công`;
    }
  }

  /**
   * Lấy thông tin context
   */
  private async getContextInfo(context?: any) {
    if (!context) return null;

    const result: any = {};

    if (context.projectId) {
      const project = await this.prisma.projects.findUnique({
        where: { id: context.projectId },
        select: { id: true, name: true, code: true }
      });
      result.project = project;
    }

    if (context.teamId) {
      const team = await this.prisma.teams.findUnique({
        where: { id: context.teamId },
        select: { id: true, name: true }
      });
      result.team = team;
    }

    if (context.divisionId) {
      const division = await this.prisma.divisions.findUnique({
        where: { id: context.divisionId },
        select: { id: true, name: true }
      });
      result.division = division;
    }

    return result;
  }
}
