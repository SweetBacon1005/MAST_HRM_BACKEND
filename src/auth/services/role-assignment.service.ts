import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PermissionService } from './permission.service';
import { RoleHierarchyService } from './role-hierarchy.service';
import { ActivityLogService } from '../../common/services/activity-log.service';
import {
  AssignmentType,
  AssignmentStatus,
} from '../dto/role-assignment.dto';
import {
  UnifiedRoleAssignmentDto,
  UnifiedRoleAssignmentResponseDto,
  AssignmentResultDto,
  ROLE_CONTEXT_REQUIREMENTS,
  RoleContextRequirement,
} from '../dto/unified-role-assignment.dto';
import {
  ROLE_NAMES,
  PROJECT_POSITIONS,
  CAUSER_TYPES,
  SUBJECT_TYPES,
} from '../constants/role.constants';

@Injectable()
export class RoleAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
    private readonly roleHierarchyService: RoleHierarchyService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * UNIFIED API - Gán role thống nhất với logic nghiệp vụ đầy đủ
   */
  async assignRoleUnified(
    dto: UnifiedRoleAssignmentDto,
    managerId: number,
  ): Promise<UnifiedRoleAssignmentResponseDto> {
    const { targetUserId, roleId, context, assignment, options } = dto;

    // 1. Validate role tồn tại và lấy thông tin
    const role = await this.prisma.roles.findUnique({
      where: { id: roleId, deleted_at: null },
    });

    if (!role) {
      throw new NotFoundException('Không tìm thấy role');
    }

    // 2. Validate context requirements cho role
    await this.validateRoleContextRequirements(role.name, context);

    // 3. Validate manager permissions
    await this.validateManagerPermissionForRole(managerId, role.name, context);

    // 4. Process assignments (single hoặc batch)
    const results: AssignmentResultDto[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Sử dụng transaction cho batch operations
    const response = await this.prisma.$transaction(async (tx) => {
      for (const userId of targetUserId) {
        try {
          const result = await this.processRoleAssignment({
            userId,
            role,
            context,
            assignment,
            options,
            managerId,
            tx,
          });

          results.push(result);
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (error: any) {
          results.push({
            userId,
            success: false,
            message: error.message || 'Lỗi không xác định',
            error: error.message,
          });
          failedCount++;
        }
      }

      return {
        success: successCount > 0,
        results,
        summary: targetUserId.length > 1 ? {
          total: targetUserId.length,
          successful: successCount,
          failed: failedCount,
        } : undefined,
      };
    });

    return response;
  }

  /**
   * Validate context requirements cho từng loại role
   */
  private async validateRoleContextRequirements(
    roleName: string,
    context?: any,
  ) {
    const requirement = ROLE_CONTEXT_REQUIREMENTS[roleName];
    
    if (!requirement || requirement === RoleContextRequirement.NONE) {
      return; // Không cần context
    }

    if (!context) {
      throw new BadRequestException(`Role ${roleName} yêu cầu context thông tin`);
    }

    switch (requirement) {
      case RoleContextRequirement.DIVISION:
        if (!context.divisionId) {
          throw new BadRequestException(`Role ${roleName} yêu cầu divisionId`);
        }
        break;
      case RoleContextRequirement.PROJECT:
        if (!context.projectId) {
          throw new BadRequestException(`Role ${roleName} yêu cầu projectId`);
        }
        break;
      case RoleContextRequirement.TEAM:
        if (!context.teamId) {
          throw new BadRequestException(`Role ${roleName} yêu cầu teamId`);
        }
        break;
    }
  }

  /**
   * Validate manager permissions cho role cụ thể
   */
  private async validateManagerPermissionForRole(
    managerId: number,
    roleName: string,
    context?: any,
  ) {
    // 1. Kiểm tra hierarchy permission cơ bản
    const hasRolePermission = await this.roleHierarchyService.hasRoleManagementPermission(
      managerId,
      roleName,
    );

    if (!hasRolePermission) {
      throw new ForbiddenException(`Bạn không có quyền gán role ${roleName}`);
    }

    // 2. Kiểm tra context-specific permissions
    const managerRole = await this.permissionService.getUserRole(managerId);
    
    if (managerRole?.name === ROLE_NAMES.DIVISION_HEAD) {
      // Division Head chỉ gán role trong division của mình
      const managerDivision = await this.prisma.user_division.findFirst({
        where: { userId: managerId },
      });

      if (context?.divisionId && managerDivision?.divisionId !== context.divisionId) {
        throw new ForbiddenException('Bạn chỉ có thể gán role trong division của mình');
      }

      if (context?.projectId) {
        // Kiểm tra project thuộc division của manager
        const project = await this.prisma.projects.findFirst({
          where: { id: context.projectId, division_id: managerDivision?.divisionId },
        });
        
        if (!project) {
          throw new ForbiddenException('Bạn chỉ có thể gán role trong project thuộc division của mình');
        }
      }

      if (context?.teamId) {
        // Kiểm tra team thuộc division của manager
        const team = await this.prisma.teams.findFirst({
          where: { id: context.teamId, division_id: managerDivision?.divisionId },
        });
        
        if (!team) {
          throw new ForbiddenException('Bạn chỉ có thể gán role trong team thuộc division của mình');
        }
      }
    }
  }

  /**
   * Process single role assignment
   */
  private async processRoleAssignment(params: {
    userId: number;
    role: any;
    context?: any;
    assignment?: any;
    options?: any;
    managerId: number;
    tx: any;
  }): Promise<AssignmentResultDto> {
    const { userId, role, context: _context, assignment: _assignment, options: _options, managerId: _managerId, tx: _tx } = params;

    // 1. Validate user exists và có thể gán role
    const _user = await this.validateUserExists(userId);
    
    // 2. Kiểm tra quyền gán role cho user cụ thể này
    const canManage = await this.roleHierarchyService.canUserManageUserRole(
      _managerId,
      userId,
      role.name,
    );

    if (!canManage) {
      throw new ForbiddenException(`Bạn không có quyền gán role ${role.name} cho user này`);
    }

    // 3. Role-specific assignment logic
    switch (role.name) {
      case ROLE_NAMES.PROJECT_MANAGER:
        return await this.assignProjectManagerUnified(params);
      case ROLE_NAMES.TEAM_LEADER:
        return await this.assignTeamLeaderUnified(params);
      case ROLE_NAMES.DIVISION_HEAD:
        return await this.assignDivisionHeadUnified(params);
      default:
        return await this.assignGeneralRoleUnified(params);
    }
  }

  /**
   * Assign Project Manager với logic chuyển giao
   */
  private async assignProjectManagerUnified(params: {
    userId: number;
    role: any;
    context?: any;
    assignment?: any;
    options?: any;
    managerId: number;
    tx: any;
  }): Promise<AssignmentResultDto> {
    const { userId, role, context, assignment, options, managerId, tx } = params;
    
    if (!context?.projectId) {
      throw new BadRequestException('PROJECT_MANAGER role yêu cầu projectId');
    }

    // Validate project access
    const project = await this.validateProjectAccess(context.projectId, managerId);
    const user = await this.validateUserExists(userId);

    // Kiểm tra PM hiện tại
    const currentPM = await this.getCurrentProjectManager(context.projectId);

    if (currentPM && !options?.confirmTransfer) {
      return {
        userId,
        success: false,
        message: 'Project đã có PM. Cần confirmTransfer: true để chuyển giao',
        error: 'REQUIRES_CONFIRMATION',
      };
    }

    // Thực hiện chuyển giao PM
    if (currentPM) {
      await tx.project_role_user.updateMany({
        where: {
          project_id: context.projectId,
          position_in_project: PROJECT_POSITIONS.MONITOR,
          user_id: currentPM.user_id,
        },
        data: {
          position_in_project: PROJECT_POSITIONS.SUPPORTER,
        },
      });
    }

    // Gán PM mới
    const existingMember = await tx.project_role_user.findFirst({
      where: {
        project_id: context.projectId,
        user_id: userId,
      },
    });

    if (existingMember) {
      await tx.project_role_user.update({
        where: { id: existingMember.id },
        data: {
          position_in_project: PROJECT_POSITIONS.MONITOR,
          role_id: role.id,
        },
      });
    } else {
      await tx.project_role_user.create({
        data: {
          project_id: context.projectId,
          user_id: userId,
          role_id: role.id,
          position_in_project: PROJECT_POSITIONS.MONITOR,
        },
      });
    }

    // Cập nhật role trong user_information
    await tx.user_information.updateMany({
      where: { user_id: userId },
      data: { role_id: role.id },
    });

    // Log activity
    await this.logActivityUnified(tx, {
      managerId,
      targetUserId: userId,
      event: 'project_manager.assigned',
      description: `Gán PM project ${project.name} cho ${user.user_information?.name || user.email}`,
      properties: {
        project_id: context.projectId,
        project_name: project.name,
        pm_id: userId,
        reason: assignment?.reason,
        replaced_pm: currentPM?.user_id || null,
      },
    });

    return {
      userId,
      success: true,
      message: `Gán PM thành công cho project ${project.name}`,
      user: {
        id: user.id,
        name: user.user_information?.name || '',
        email: user.email,
        role: {
          id: role.id,
          name: role.name,
        },
      },
      context: {
        project: {
          id: project.id,
          name: project.name,
          code: project.code,
        },
      },
      replacedUser: currentPM ? {
        id: currentPM.user_id,
        name: currentPM.user.user_information?.name || '',
        email: currentPM.user.email,
      } : undefined,
    };
  }

  /**
   * Assign Team Leader với logic chuyển giao
   */
  private async assignTeamLeaderUnified(params: {
    userId: number;
    role: any;
    context?: any;
    assignment?: any;
    options?: any;
    managerId: number;
    tx: any;
  }): Promise<AssignmentResultDto> {
    const { userId, role, context, assignment, options, managerId, tx } = params;
    
    if (!context?.teamId) {
      throw new BadRequestException('TEAM_LEADER role yêu cầu teamId');
    }

    // Validate team access
    const team = await this.validateTeamAccess(context.teamId, managerId);
    const user = await this.validateUserExists(userId);

    // Kiểm tra Team Leader hiện tại
    const currentTL = await this.getCurrentTeamLeader(context.teamId);

    if (currentTL && !options?.confirmTransfer) {
      return {
        userId,
        success: false,
        message: 'Team đã có Team Leader. Cần confirmTransfer: true để chuyển giao',
        error: 'REQUIRES_CONFIRMATION',
      };
    }

    // Thực hiện chuyển giao TL
    if (currentTL) {
      await tx.user_division.updateMany({
        where: {
          teamId: context.teamId,
          userId: currentTL.userId,
          role: { name: ROLE_NAMES.TEAM_LEADER },
        },
        data: {
          role_id: await this.getRoleId(ROLE_NAMES.EMPLOYEE),
        },
      });

      await tx.user_information.updateMany({
        where: { user_id: currentTL.userId },
        data: { role_id: await this.getRoleId(ROLE_NAMES.EMPLOYEE) },
      });
    }

    // Gán TL mới
    const existingMember = await tx.user_division.findFirst({
      where: {
        teamId: context.teamId,
        userId,
      },
    });

    if (existingMember) {
      await tx.user_division.update({
        where: { id: existingMember.id },
        data: { role_id: role.id },
      });
    } else {
      await tx.user_division.create({
        data: {
          userId,
          teamId: context.teamId,
          divisionId: team.division_id,
          role_id: role.id,
        },
      });
    }

    // Cập nhật role trong user_information
    await tx.user_information.updateMany({
      where: { user_id: userId },
      data: { role_id: role.id },
    });

    // Log activity
    await this.logActivityUnified(tx, {
      managerId,
      targetUserId: userId,
      event: 'team_leader.assigned',
      description: `Gán Team Leader team ${team.name} cho ${user.user_information?.name || user.email}`,
      properties: {
        team_id: context.teamId,
        team_name: team.name,
        tl_id: userId,
        reason: assignment?.reason,
        replaced_tl: currentTL?.userId || null,
      },
    });

    return {
      userId,
      success: true,
      message: `Gán Team Leader thành công cho team ${team.name}`,
      user: {
        id: user.id,
        name: user.user_information?.name || '',
        email: user.email,
        role: {
          id: role.id,
          name: role.name,
        },
      },
      context: {
        team: {
          id: team.id,
          name: team.name,
        },
      },
      replacedUser: currentTL ? {
        id: currentTL.userId,
        name: currentTL.user.user_information?.name || '',
        email: currentTL.user.email,
      } : undefined,
    };
  }

  /**
   * Assign Division Head với logic chuyển giao
   */
  private async assignDivisionHeadUnified(params: {
    userId: number;
    role: any;
    context?: any;
    assignment?: any;
    options?: any;
    managerId: number;
    tx: any;
  }): Promise<AssignmentResultDto> {
    const { userId, role, context, assignment, options, managerId, tx } = params;
    
    if (!context?.divisionId) {
      throw new BadRequestException('DIVISION_HEAD role yêu cầu divisionId');
    }

    // Validate division head assignment permission (chỉ HR Manager+)
    await this.validateDivisionHeadAssignmentPermission(managerId);

    const division = await this.validateDivisionExists(context.divisionId);
    const user = await this.validateUserExists(userId);

    // Kiểm tra Division Head hiện tại
    const currentDivisionHead = await this.getCurrentDivisionHead(context.divisionId);

    if (currentDivisionHead && !options?.confirmTransfer) {
      return {
        userId,
        success: false,
        message: `Division "${division.name}" đã có Division Head. Cần confirmTransfer: true để chuyển giao`,
        error: 'REQUIRES_CONFIRMATION',
      };
    }

    // Thu hồi Division Head cũ nếu có
    if (currentDivisionHead) {
      await tx.user_information.updateMany({
        where: { 
          user_id: currentDivisionHead.id,
          role: { name: ROLE_NAMES.DIVISION_HEAD }
        },
        data: { role_id: await this.getRoleId(ROLE_NAMES.EMPLOYEE) },
      });
    }

    // Gán Division Head mới
    await tx.user_information.updateMany({
      where: { user_id: userId },
      data: { role_id: role.id },
    });

    // Đảm bảo user thuộc division này
    await tx.user_division.upsert({
      where: {
        id: await this.getUserDivisionId(userId, context.divisionId) || 0,
      },
      update: { role_id: role.id },
      create: {
        userId: userId,
        divisionId: context.divisionId,
        role_id: role.id,
      },
    });

    // Log activity
    await this.logActivityUnified(tx, {
      managerId,
      targetUserId: userId,
      event: 'division_head.assigned',
      description: `Gán Division Head division ${division.name} cho ${user.user_information?.name || user.email}`,
      properties: {
        division_id: context.divisionId,
        division_name: division.name,
        division_head_id: userId,
        reason: assignment?.reason,
        replaced_division_head: currentDivisionHead?.id || null,
      },
    });

    return {
      userId,
      success: true,
      message: `Gán Division Head thành công cho division ${division.name}`,
      user: {
        id: user.id,
        name: user.user_information?.name || '',
        email: user.email,
        role: {
          id: role.id,
          name: role.name,
        },
      },
      context: {
        division: {
          id: division.id,
          name: division.name,
        },
      },
      replacedUser: currentDivisionHead ? {
        id: currentDivisionHead.id,
        name: currentDivisionHead.user_information?.name || '',
        email: currentDivisionHead.email,
      } : undefined,
    };
  }

  /**
   * Assign general role (không cần context đặc biệt)
   */
  private async assignGeneralRoleUnified(params: {
    userId: number;
    role: any;
    context?: any;
    assignment?: any;
    options?: any;
    managerId: number;
    tx: any;
  }): Promise<AssignmentResultDto> {
    const { userId, role, assignment, managerId, tx } = params;

    const user = await this.validateUserExists(userId);

    // Lưu role cũ để log
    const oldUserInfo = await tx.user_information.findFirst({
      where: { user_id: userId },
      include: { role: true },
    });

    // Cập nhật role trong user_information
    await tx.user_information.updateMany({
      where: { user_id: userId },
      data: { role_id: role.id },
    });

    // Cập nhật user_division nếu có
    await tx.user_division.updateMany({
      where: { userId },
      data: { role_id: role.id },
    });

    // Log activity
    await this.logActivityUnified(tx, {
      managerId,
      targetUserId: userId,
      event: 'role.assigned',
      description: `Gán role ${role.name} cho ${user.user_information?.name || user.email}`,
      properties: {
        old_role: oldUserInfo?.role?.name,
        new_role: role.name,
        old_role_id: oldUserInfo?.role?.id,
        new_role_id: role.id,
        reason: assignment?.reason,
      },
    });

    return {
      userId,
      success: true,
      message: `Gán role ${role.name} thành công`,
      user: {
        id: user.id,
        name: user.user_information?.name || '',
        email: user.email,
        role: {
          id: role.id,
          name: role.name,
        },
      },
    };
  }

  /**
   * Log activity cho unified API
   */
  private async logActivityUnified(
    tx: any,
    params: {
      managerId: number;
      targetUserId: number;
      event: string;
      description: string;
      properties: any;
    },
  ) {
    const managerRole = await this.permissionService.getUserRole(params.managerId);
    const causerType = managerRole?.name === ROLE_NAMES.DIVISION_HEAD 
      ? CAUSER_TYPES.DIVISION_MASTER 
      : CAUSER_TYPES.USERS;

    await tx.activity_log.create({
      data: {
        log_name: 'unified_role_assignment',
        causer_id: params.managerId,
        causer_type: causerType,
        subject_id: params.targetUserId,
        subject_type: SUBJECT_TYPES.USERS,
        event: params.event,
        description: params.description,
        properties: JSON.stringify(params.properties),
        batch_uuid: '',
      },
    });
  }

  /**
   * Lấy PM hiện tại của project
   */
  private async getCurrentProjectManager(projectId: number) {
    return await this.prisma.project_role_user.findFirst({
      where: {
        project_id: projectId,
        position_in_project: PROJECT_POSITIONS.MONITOR,
      },
      include: {
        user: {
          select: {
            id: true,
            user_information: { select: { name: true } },
            email: true,
          },
        },
      },
    });
  }

  /**
   * Lấy Team Leader hiện tại của team
   */
  private async getCurrentTeamLeader(teamId: number) {
    return await this.prisma.user_division.findFirst({
      where: {
        teamId,
        role: { name: ROLE_NAMES.TEAM_LEADER },
      },
      include: {
        user: {
          select: {
            id: true,
            user_information: { select: { name: true } },
            email: true,
          },
        },
      },
    });
  }

  /**
   * Kiểm tra quyền gán Division Head (chỉ HR Manager, Admin, Super Admin)
   */
  private async validateDivisionHeadAssignmentPermission(managerId: number) {
    const managerRole = await this.prisma.user_information.findFirst({
      where: { user_id: managerId },
      include: { role: true },
    });

    if (!managerRole) {
      throw new ForbiddenException('Không tìm thấy role của manager');
    }

    const allowedRoles = [ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN];
    
    if (!allowedRoles.includes(managerRole?.role?.name as any)) {
      throw new ForbiddenException('Chỉ HR Manager, Admin hoặc Super Admin mới có thể gán Division Head');
    }
  }

  /**
   * Kiểm tra division tồn tại
   */
  private async validateDivisionExists(divisionId: number) {
    const division = await this.prisma.divisions.findFirst({
      where: { id: divisionId, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy division');
    }

    return division;
  }

  /**
   * Kiểm tra user tồn tại
   */
  private async validateUserExists(userId: number) {
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
      include: {
        user_information: {
          select: { name: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    return user;
  }

  /**
   * Lấy Division Head hiện tại
   */
  private async getCurrentDivisionHead(divisionId: number) {
    return await this.prisma.users.findFirst({
      where: {
        user_division: {
          some: { divisionId: divisionId },
        },
        user_information: {
          role: { name: ROLE_NAMES.DIVISION_HEAD },
        },
        deleted_at: null,
      },
      include: {
        user_information: {
          select: { name: true },
        },
      },
    });
  }

  /**
   * Thu hồi Division Head hiện tại
   */
  private async revokeCurrentDivisionHead(divisionId: number, managerId: number, tx: any) {
    // Cập nhật assignment cũ thành REPLACED
    await tx.role_assignments.updateMany({
      where: {
        context_id: divisionId,
        context_type: 'division',
        assignment_type: AssignmentType.DIVISION_HEAD,
        status: AssignmentStatus.ACTIVE,
      },
      data: {
        status: AssignmentStatus.REPLACED,
        revoked_by: managerId,
        revoked_at: new Date(),
      },
    });

    // Xóa manager_id khỏi division
    await tx.divisions.update({
      where: { id: divisionId },
      data: { manager_id: null },
    });
  }

  /**
   * Validate quyền của manager
   */
  private async validateManagerPermission(managerId: number, targetUserId: number) {
    const canManage = await this.roleHierarchyService.canUserManageUserRole(
      managerId,
      targetUserId,
    );

    if (!canManage) {
      throw new ForbiddenException('Bạn không có quyền gán role cho user này');
    }
  }

  /**
   * Validate project access
   */
  private async validateProjectAccess(projectId: number, managerId: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId, deleted_at: null },
      include: {
        division: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy project');
    }

    // Kiểm tra manager có thuộc cùng division không
    const managerRole = await this.permissionService.getUserRole(managerId);
    if (managerRole?.name === ROLE_NAMES.DIVISION_HEAD) {
      const managerDivision = await this.prisma.user_division.findFirst({
        where: { userId: managerId },
      });

      if (managerDivision?.divisionId !== project.division_id) {
        throw new ForbiddenException('Bạn chỉ có thể quản lý project trong division của mình');
      }
    }

    return project;
  }

  /**
   * Validate team access
   */
  private async validateTeamAccess(teamId: number, managerId: number) {
    const team = await this.prisma.teams.findUnique({
      where: { id: teamId, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Không tìm thấy team');
    }

    // Kiểm tra manager có thuộc cùng division không
    const managerRole = await this.permissionService.getUserRole(managerId);
    if (managerRole?.name === ROLE_NAMES.DIVISION_HEAD) {
      const managerDivision = await this.prisma.user_division.findFirst({
        where: { userId: managerId },
      });

      if (managerDivision?.divisionId !== team.division_id) {
        throw new ForbiddenException('Bạn chỉ có thể quản lý team trong division của mình');
      }
    }

    return team;
  }

  /**
   * Validate user access
   */
  private async validateUserAccess(userId: number, _managerId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId, deleted_at: null },
      select: {
        id: true,
        user_information: { select: { name: true } },
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    return user;
  }

  /**
   * Lấy role ID theo tên
   */
  private async getRoleId(roleName: string): Promise<number> {
    const role = await this.prisma.roles.findFirst({
      where: { name: roleName, deleted_at: null },
    });

    if (!role) {
      throw new NotFoundException(`Không tìm thấy role ${roleName}`);
    }

    return role.id;
  }

  /**
   * Lấy thông tin PM hiện tại của project
   */
  async getProjectManagerInfo(projectId: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId, deleted_at: null },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy project');
    }

    const currentPM = await this.getCurrentProjectManager(projectId);

    return {
      project,
      currentPM: currentPM ? {
        id: currentPM.user_id,
        name: currentPM.user.user_information?.name || '',
        email: currentPM.user.email,
        assignedAt: new Date(), // Tạm thời dùng current date
      } : null,
    };
  }

  /**
   * Lấy thông tin Division Head hiện tại của division
   */
  async getDivisionHeadInfo(divisionId: number) {
    const division = await this.prisma.divisions.findFirst({
      where: { id: divisionId, deleted_at: null },
      select: { id: true, name: true },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy division');
    }

    const divisionHead = await this.getCurrentDivisionHead(divisionId);

    return {
      divisionHead,
      division,
    };
  }

  /**
   * Lấy thông tin Team Leader hiện tại của team
   */
  async getTeamLeaderInfo(teamId: number) {
    const team = await this.prisma.teams.findUnique({
      where: { id: teamId, deleted_at: null },
      select: {
        id: true,
        name: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Không tìm thấy team');
    }

    const currentTL = await this.getCurrentTeamLeader(teamId);

    return {
      team,
      currentTL: currentTL ? {
        id: currentTL.userId,
        name: currentTL.user.user_information?.name || '',
        email: currentTL.user.email,
        assignedAt: currentTL.created_at,
      } : null,
    };
  }

  /**
   * Lấy lịch sử PM của project
   */
  async getProjectManagerHistory(projectId: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId, deleted_at: null },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy project');
    }

    // Lấy lịch sử từ activity_log
    const history = await this.prisma.activity_log.findMany({
      where: {
        event: {
          in: ['project_manager.assigned', 'project_manager.replaced'],
        },
        description: {
          contains: `project ${project.name}`,
        },
      },
      include: {
        subject: {
          select: {
            id: true,
            user_information: { select: { name: true } },
            email: true,
          },
        },
        causer: {
          select: {
            id: true,
            user_information: { select: { name: true } },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const formattedHistory = history.map((log) => {
      const properties = typeof log.properties === 'string' 
        ? JSON.parse(log.properties) 
        : log.properties || {};

      return {
        id: log.id,
        userId: log.subject_id,
        userName: log.subject?.user_information?.name || 'Unknown',
        userEmail: log.subject?.email || 'Unknown',
        event: log.event,
        assignedAt: log.created_at,
        assignedBy: {
          id: log.causer_id,
          name: log.causer?.user_information?.name || 'Unknown',
        },
        reason: properties.reason || null,
        description: log.description,
      };
    });

    return {
      project,
      history: formattedHistory,
    };
  }

  /**
   * Lấy lịch sử Team Leader của team
   */
  async getTeamLeaderHistory(teamId: number) {
    const team = await this.prisma.teams.findUnique({
      where: { id: teamId, deleted_at: null },
      select: {
        id: true,
        name: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Không tìm thấy team');
    }

    // Lấy lịch sử từ activity_log
    const history = await this.prisma.activity_log.findMany({
      where: {
        event: {
          in: ['team_leader.assigned', 'team_leader.replaced'],
        },
        description: {
          contains: `team ${team.name}`,
        },
      },
      include: {
        subject: {
          select: {
            id: true,
            user_information: { select: { name: true } },
            email: true,
          },
        },
        causer: {
          select: {
            id: true,
            user_information: { select: { name: true } },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const formattedHistory = history.map((log) => {
      const properties = typeof log.properties === 'string' 
        ? JSON.parse(log.properties) 
        : log.properties || {};

      return {
        id: log.id,
        userId: log.subject_id,
        userName: log.subject?.user_information?.name || 'Unknown',
        userEmail: log.subject?.email || 'Unknown',
        event: log.event,
        assignedAt: log.created_at,
        assignedBy: {
          id: log.causer_id,
          name: log.causer?.user_information?.name || 'Unknown',
        },
        reason: properties.reason || null,
        description: log.description,
      };
    });

    return {
      team,
      history: formattedHistory,
    };
  }

  /**
   * Log activity
   */
  private async logActivity(
    tx: any,
    params: {
      managerId: number;
      targetUserId: number;
      event: string;
      description: string;
      properties: any;
    },
  ) {
    const managerRole = await this.permissionService.getUserRole(params.managerId);
    const causerType = managerRole?.name === ROLE_NAMES.DIVISION_HEAD 
      ? CAUSER_TYPES.DIVISION_MASTER 
      : CAUSER_TYPES.USERS;

    await tx.activity_log.create({
      data: {
        log_name: 'role_assignment',
        causer_id: params.managerId,
        causer_type: causerType,
        subject_id: params.targetUserId,
        subject_type: SUBJECT_TYPES.USERS,
        event: params.event,
        description: params.description,
        properties: JSON.stringify(params.properties),
        batch_uuid: '',
      },
    });
  }

  private async getUserDivisionId(userId: number, divisionId: number): Promise<number | null> {
    const userDivision = await this.prisma.user_division.findFirst({
      where: {
        userId: userId,
        divisionId: divisionId,
      },
      select: { id: true },
    });
    return userDivision?.id || null;
  }
}
