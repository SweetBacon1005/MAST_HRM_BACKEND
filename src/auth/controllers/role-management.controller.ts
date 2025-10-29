import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  ACTIVITY_LOG_EVENTS,
  CAUSER_TYPES,
  PROJECT_POSITIONS,
  ROLE_NAMES,
  SUBJECT_TYPES,
} from '../constants/role.constants';
import { GetUser } from '../decorators/get-user.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';
import {
  UpdateUserRoleDto,
} from '../dto/role-management.dto';
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
    description: 'Gán role cho một hoặc nhiều user với logic nghiệp vụ đầy đủ. Thay thế tất cả các API gán role riêng lẻ.'
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
                name: 'project_manager'
              }
            },
            context: {
              project: {
                id: 10,
                name: 'Project ABC',
                code: 'ABC001'
              }
            },
            replacedUser: {
              id: 456,
              name: 'Nguyễn Văn B',
              email: 'b.nguyen@company.com'
            }
          }
        ],
        summary: {
          total: 1,
          successful: 1,
          failed: 0
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu đầu vào không hợp lệ hoặc thiếu context yêu cầu',
    schema: {
      example: {
        statusCode: 400,
        message: 'Role project_manager yêu cầu projectId',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền gán role này',
    schema: {
      example: {
        statusCode: 403,
        message: 'Bạn không có quyền gán role project_manager',
        error: 'Forbidden'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy role, user, project, team hoặc division',
  })
  async assignRoleUnified(
    @Body() dto: UnifiedRoleAssignmentDto,
    @GetUser('id') managerId: number,
  ): Promise<UnifiedRoleAssignmentResponseDto> {
    return await this.roleAssignmentService.assignRoleUnified(dto, managerId);
  }

  // ==================== READ-ONLY ENDPOINTS ====================

  @Get('assignable-roles')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy danh sách roles có thể gán cho người khác' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách roles thành công',
  })
  async getAssignableRoles(@GetUser('id') userId: number) {
    const userRole = await this.permissionService.getUserRole(userId);
    if (!userRole) {
      return {
        assignableRoles: [],
        hierarchy: this.roleHierarchyService.getAllRolesByHierarchy(),
        userRole: null,
      };
    }

    let assignableRoleNames: string[] = [];

    // Logic đặc biệt cho division_head
    if (userRole.name === ROLE_NAMES.DIVISION_HEAD) {
      // Division head chỉ có thể gán team_leader và project_manager
      assignableRoleNames = [
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.PROJECT_MANAGER,
      ];
    } else {
      // Logic chung cho các role khác
      assignableRoleNames =
        await this.roleHierarchyService.getAssignableRoles(userId);
    }

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
      userRole: {
        id: userRole.id,
        name: userRole.name,
      },
      restrictions:
        userRole.name === ROLE_NAMES.DIVISION_HEAD
          ? {
              scope: 'division_only',
              message: 'Chỉ có thể gán role cho nhân viên trong cùng phòng ban',
            }
          : null,
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
    const managerRole = await this.permissionService.getUserRole(managerId);
    let assignableRoleNames: string[] = [];

    // Logic đặc biệt cho division_head
    if (managerRole?.name === ROLE_NAMES.DIVISION_HEAD) {
      // Division head chỉ có thể gán team_leader và project_manager
      assignableRoleNames = [
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.PROJECT_MANAGER,
      ];
    } else {
      // Logic chung cho các role khác
      assignableRoleNames =
        await this.roleHierarchyService.getAssignableRoles(managerId);
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

  @Patch('user/:userId/role')
  @RequirePermission('role.update')
  @ApiOperation({ summary: 'Cập nhật role cho user (cách khác)' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật role thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền cập nhật role',
  })
  async updateUserRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @GetUser('id') managerId: number,
  ) {
    // Use unified API
    const unifiedDto: UnifiedRoleAssignmentDto = {
      targetUserId: [userId],
      roleId: updateUserRoleDto.roleId,
      assignment: {
        reason: updateUserRoleDto.reason,
      },
    };

    const result = await this.roleAssignmentService.assignRoleUnified(unifiedDto, managerId);
    
    // Return single result for backward compatibility
    return {
      message: result.results[0]?.message || 'Cập nhật role thành công',
      user: result.results[0]?.user,
      success: result.results[0]?.success,
    };
  }


  @Get('user/:userId/role-history')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy lịch sử thay đổi role của user' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch sử thành công',
  })
  async getUserRoleHistory(@Param('userId', ParseIntPipe) userId: number) {
    const history = await this.prisma.activity_log.findMany({
      where: {
        subject_id: userId,
        event: {
          in: ['role.assigned', 'role.bulk_assigned'],
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        causer: {
          select: {
            id: true,
            user_information: {
              select: {
                name: true,
              },
            },
            email: true,
          },
        },
      },
    });

    return {
      userId,
      totalChanges: history.length,
      history: history.map((log) => ({
        id: log.id,
        event: log.event,
        description: log.description,
        changedBy:
          log.causer?.user_information?.[0]?.name ||
          log.causer?.email ||
          'System',
        changes:
          typeof log.properties === 'string'
            ? JSON.parse(log.properties)
            : log.properties || {},
        changedAt: log.created_at,
      })),
    };
  }

  @Delete('user/:userId/role')
  @RequirePermission('role.update')
  @ApiOperation({ summary: 'Thu hồi role của user (reset về employee)' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Thu hồi role thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể thu hồi role do ràng buộc nghiệp vụ',
  })
  async revokeUserRole(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser('id') managerId: number,
  ) {
    // Kiểm tra user tồn tại và lấy role hiện tại
    const user = await this.prisma.users.findUnique({
      where: { id: userId, deleted_at: null },
      include: {
        user_information: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    const currentRole = user.user_information?.[0]?.role;
    if (!currentRole || currentRole.name === ROLE_NAMES.EMPLOYEE) {
      throw new BadRequestException(
        'User đã ở role employee hoặc không có role',
      );
    }

    // Kiểm tra quyền thu hồi
    const canManage = await this.roleHierarchyService.canUserManageUserRole(
      managerId,
      userId,
    );

    if (!canManage) {
      throw new ForbiddenException(
        'Bạn không có quyền thu hồi role của user này',
      );
    }

    // Kiểm tra ràng buộc nghiệp vụ trước khi thu hồi
    if (currentRole.name === ROLE_NAMES.PROJECT_MANAGER) {
      // Kiểm tra có đang là PM chính của dự án đang hoạt động không
      const activePMProjects = await this.prisma.project_role_user.findMany({
        where: {
          user_id: userId,
          position_in_project: PROJECT_POSITIONS.MONITOR, // PM chính
          project: {
            status: {
              in: ACTIVE_PROJECT_STATUSES as any,
            },
            deleted_at: null,
          },
        },
        include: {
          project: {
            select: {
              project_role_user: {
                select: {
                  user: {
                    select: {
                      user_information: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              code: true,
            },
          },
        },
      });

      if (activePMProjects.length > 0) {
        const projectNames = activePMProjects
          .map((p) => p?.project?.project_role_user?.[0]?.user?.user_information?.name)
          .join(', ');
        throw new BadRequestException(
          `Không thể thu hồi role PM khi đang là PM chính của các dự án đang hoạt động: ${projectNames}. Vui lòng chuyển giao quyền trước.`,
        );
      }
    }

    // Lấy role "employee" (role mặc định)
    const employeeRole = await this.prisma.roles.findFirst({
      where: { name: ROLE_NAMES.EMPLOYEE, deleted_at: null },
    });

    if (!employeeRole) {
      throw new NotFoundException('Không tìm thấy role mặc định (employee)');
    }

    // Cập nhật role về employee
    await this.prisma.user_information.updateMany({
      where: { user_id: userId },
      data: { role_id: employeeRole.id },
    });

    // Cập nhật user_division nếu cần
    await this.prisma.user_division.updateMany({
      where: { userId },
      data: { role_id: employeeRole.id },
    });

    // Xác định causer_type
    const managerRole = await this.permissionService.getUserRole(managerId);
    const causerType =
      managerRole?.name === ROLE_NAMES.DIVISION_HEAD
        ? CAUSER_TYPES.DIVISION_MASTER
        : CAUSER_TYPES.USERS;

    // Log activity
    await this.prisma.activity_log.create({
      data: {
        log_name: 'role_management',
        causer_id: managerId,
        causer_type: causerType,
        subject_id: userId,
        subject_type: SUBJECT_TYPES.USERS,
        event: ACTIVITY_LOG_EVENTS.REVOKE_ROLE,
        description: `Thu hồi role ${currentRole.name} của user ${user.user_information?.name || user.email}`,
        properties: JSON.stringify({
          old_role: currentRole.name,
          new_role: ROLE_NAMES.EMPLOYEE,
          old_role_id: currentRole.id,
          new_role_id: employeeRole.id,
          division_id:
            managerRole?.name === ROLE_NAMES.DIVISION_HEAD
              ? (
                  await this.prisma.user_division.findFirst({
                    where: { userId: managerId },
                  })
                )?.divisionId
              : null,
        }),
        batch_uuid: '',
      },
    });

    return {
      message: 'Thu hồi role thành công',
      user: {
        id: user.id,
        name: user.user_information?.name || '',
        email: user.email,
        role: {
          id: employeeRole.id,
          name: ROLE_NAMES.EMPLOYEE,
        },
      },
      changes: {
        from: currentRole.name,
        to: ROLE_NAMES.EMPLOYEE,
      },
    };
  }

  @Get('user/:userId/projects')
  @RequirePermission('role.view')
  @ApiOperation({ summary: 'Lấy danh sách dự án mà user đang tham gia' })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách dự án thành công',
    schema: {
      example: {
        user: {
          id: 1,
          name: 'Nguyễn Văn A',
          email: 'user@example.com',
        },
        projects: [
          {
            id: 1,
            name: 'Dự án ABC',
            code: 'ABC001',
            status: 'IN_PROGRESS',
            position: 'monitor', // PM chính
            role: 'project_manager',
          },
          {
            id: 2,
            name: 'Dự án XYZ',
            code: 'XYZ002',
            status: 'OPEN',
            position: 'supporter', // Hỗ trợ
            role: 'project_manager',
          },
        ],
        summary: {
          total_projects: 2,
          as_monitor: 1, // PM chính
          as_supporter: 1, // Hỗ trợ
          active_projects: 2,
        },
      },
    },
  })
  async getUserProjects(
    @Param('userId', ParseIntPipe) userId: number,
    @GetUser('id') managerId: number,
  ) {
    // Kiểm tra user tồn tại
    const user = await this.prisma.users.findUnique({
      where: { id: userId, deleted_at: null },
      select: {
        id: true,
        email: true,
        user_information: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // Kiểm tra quyền xem thông tin user
    const canManage = await this.roleHierarchyService.canUserManageUserRole(
      managerId,
      userId,
    );

    if (!canManage) {
      throw new ForbiddenException(
        'Bạn không có quyền xem thông tin dự án của user này',
      );
    }

    // Lấy danh sách dự án
    const userProjects = await this.prisma.project_role_user.findMany({
      where: {
        user_id: userId,
        project: {
          deleted_at: null,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            start_date: true,
            end_date: true,
          },
        },
      },
      orderBy: {
        project: {
          start_date: 'desc',
        },
      },
    });

    // Xử lý dữ liệu
    const projects = userProjects.map((up) => ({
      id: up.project.id,
      name: up.project.name,
      code: up.project.code,
      status: up.project.status,
      start_date: up.project.start_date,
      end_date: up.project.end_date,
      position:
        up.position_in_project === PROJECT_POSITIONS.MONITOR
          ? 'monitor'
          : up.position_in_project === PROJECT_POSITIONS.SUPPORTER
            ? 'supporter'
            : 'implementor',
      position_code: up.position_in_project,
      role_id: up.role_id,
    }));

    // Tính toán thống kê
    const summary = {
      total_projects: projects.length,
      as_monitor: projects.filter((p) => p.position === 'monitor').length,
      as_supporter: projects.filter((p) => p.position === 'supporter').length,
      as_implementor: projects.filter((p) => p.position === 'implementor')
        .length,
      active_projects: projects.filter((p) =>
        ACTIVE_PROJECT_STATUSES.includes(p.status as any),
      ).length,
    };

    return {
      user,
      projects,
      summary,
    };
  }

  // ==================== READ-ONLY ROLE INFO ENDPOINTS ====================

  @Get('project/:projectId/current-pm')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy thông tin PM hiện tại của project' })
  @ApiParam({ name: 'projectId', description: 'ID của project' })
  async getCurrentProjectManager(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return await this.roleAssignmentService.getProjectManagerInfo(projectId);
  }

  @Get('team/:teamId/current-leader')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy thông tin Team Leader hiện tại của team' })
  @ApiParam({ name: 'teamId', description: 'ID của team' })
  async getCurrentTeamLeader(@Param('teamId', ParseIntPipe) teamId: number) {
    return await this.roleAssignmentService.getTeamLeaderInfo(teamId);
  }

  @Get('division/:divisionId/current-head')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy thông tin Division Head hiện tại của division' })
  @ApiParam({ name: 'divisionId', description: 'ID của division' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin Division Head hiện tại',
    schema: {
      type: 'object',
      properties: {
        divisionHead: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'number' },
            user_information: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
        division: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
          },
        },
      },
    },
  })
  async getCurrentDivisionHead(@Param('divisionId', ParseIntPipe) divisionId: number) {
    return await this.roleAssignmentService.getDivisionHeadInfo(divisionId);
  }

  @Get('project/:projectId/pm-history')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy lịch sử PM của project' })
  @ApiParam({ name: 'projectId', description: 'ID của project' })
  async getProjectManagerHistory(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return await this.roleAssignmentService.getProjectManagerHistory(projectId);
  }

  @Get('team/:teamId/leader-history')
  @RequirePermission('role.read')
  @ApiOperation({ summary: 'Lấy lịch sử Team Leader của team' })
  @ApiParam({ name: 'teamId', description: 'ID của team' })
  async getTeamLeaderHistory(@Param('teamId', ParseIntPipe) teamId: number) {
    return await this.roleAssignmentService.getTeamLeaderHistory(teamId);
  }
}
