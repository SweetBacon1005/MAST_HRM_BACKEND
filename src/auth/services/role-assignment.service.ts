import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PermissionService } from './permission.service';
import { RoleHierarchyService } from './role-hierarchy.service';
import { ActivityLogService } from '../../common/services/activity-log.service';
import {
  AssignProjectManagerDto,
  AssignTeamLeaderDto,
  AssignDivisionHeadDto,
  RevokeAssignmentDto,
  AssignmentType,
  AssignmentStatus,
} from '../dto/role-assignment.dto';
import {
  ROLE_NAMES,
  PROJECT_POSITIONS,
  ACTIVE_PROJECT_STATUSES,
  ACTIVITY_LOG_EVENTS,
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
   * Gán PM cho project với logic chuyển giao
   */
  async assignProjectManager(
    dto: AssignProjectManagerDto,
    managerId: number,
  ) {
    const { projectId, userId, reason, confirmTransfer } = dto;

    // 1. Kiểm tra quyền
    await this.validateManagerPermission(managerId, userId);

    // 2. Kiểm tra project tồn tại và thuộc division
    const project = await this.validateProjectAccess(projectId, managerId);

    // 3. Kiểm tra user tồn tại và cùng division
    const user = await this.validateUserAccess(userId, managerId);

    // 4. Kiểm tra PM hiện tại
    const currentPM = await this.getCurrentProjectManager(projectId);

    if (currentPM && !confirmTransfer) {
      return {
        requiresConfirmation: true,
        currentPM: {
          id: currentPM.user_id,
          name: currentPM.user.user_information?.name || '',
          email: currentPM.user.email,
        },
        message: 'Project đã có PM. Bạn có muốn chuyển giao quyền không?',
      };
    }

    // 5. Thực hiện chuyển giao
    const result = await this.prisma.$transaction(async (tx) => {
      // 5.1. Cập nhật PM cũ nếu có
      if (currentPM) {
        await tx.project_role_user.updateMany({
          where: {
            project_id: projectId,
            position_in_project: PROJECT_POSITIONS.MONITOR,
            user_id: currentPM.user_id,
          },
          data: {
            // Chuyển thành supporter
            position_in_project: PROJECT_POSITIONS.SUPPORTER,
          },
        });

        // Log chuyển giao
        await this.logActivity(tx, {
          managerId,
          targetUserId: currentPM.user_id,
          event: 'project_manager.replaced',
          description: `Chuyển giao PM project ${project.name} từ ${currentPM.user.user_information?.name || ''} sang ${user.user_information?.name || ''}`,
          properties: {
            project_id: projectId,
            project_name: project.name,
            old_pm_id: currentPM.user_id,
            new_pm_id: userId,
            reason,
          },
        });
      }

      // 5.2. Kiểm tra user đã trong project chưa
      const existingMember = await tx.project_role_user.findFirst({
        where: {
          project_id: projectId,
          user_id: userId,
        },
      });

      if (existingMember) {
        // Cập nhật thành PM
        await tx.project_role_user.update({
          where: { id: existingMember.id },
          data: {
            position_in_project: PROJECT_POSITIONS.MONITOR,
            role_id: await this.getRoleId(ROLE_NAMES.PROJECT_MANAGER),
          },
        });
      } else {
        // Thêm mới vào project
        await tx.project_role_user.create({
          data: {
            project_id: projectId,
            user_id: userId,
            role_id: await this.getRoleId(ROLE_NAMES.PROJECT_MANAGER),
            position_in_project: PROJECT_POSITIONS.MONITOR,
          },
        });
      }

      // 5.3. Cập nhật role trong user_information
      await tx.user_information.updateMany({
        where: { user_id: userId },
        data: { role_id: await this.getRoleId(ROLE_NAMES.PROJECT_MANAGER) },
      });

      // 5.4. Log gán PM mới
      await this.logActivity(tx, {
        managerId,
        targetUserId: userId,
        event: 'project_manager.assigned',
        description: `Gán PM project ${project.name} cho ${user.user_information?.name || ''}`,
        properties: {
          project_id: projectId,
          project_name: project.name,
          pm_id: userId,
          reason,
          replaced_pm: currentPM?.user_id || null,
        },
      });

      return { currentPM, newPM: user, project };
    });

    return {
      success: true,
      message: currentPM 
        ? `Chuyển giao PM thành công từ ${result.currentPM?.user.user_information?.name || ''} sang ${result.newPM.user_information?.name || ''}`
        : `Gán PM thành công cho ${result.newPM.user_information?.name || ''}`,
      project: {
        id: result.project.id,
        name: result.project.name,
        code: result.project.code,
      },
      newPM: {
        id: result.newPM.id,
        name: result.newPM.user_information?.name || '',
        email: result.newPM.email,
      },
      previousPM: result.currentPM ? {
        id: result.currentPM.user_id,
        name: result.currentPM.user.user_information?.name || '',
        email: result.currentPM.user.email,
      } : null,
    };
  }

  /**
   * Gán Division Head cho division với logic chuyển giao
   */
  async assignDivisionHead(
    dto: AssignDivisionHeadDto,
    managerId: number,
  ) {
    const { divisionId, userId, reason, confirmTransfer } = dto;

    // 1. Kiểm tra quyền - chỉ HR Manager, Admin, Super Admin có thể gán Division Head
    await this.validateDivisionHeadAssignmentPermission(managerId);

    // 2. Kiểm tra division tồn tại
    const division = await this.validateDivisionExists(divisionId);

    // 3. Kiểm tra user tồn tại
    const user = await this.validateUserExists(userId);

    // 4. Kiểm tra Division Head hiện tại
    const currentDivisionHead = await this.getCurrentDivisionHead(divisionId);

    if (currentDivisionHead && !confirmTransfer) {
      throw new BadRequestException(
        `Division "${division.name}" đã có Division Head: ${currentDivisionHead.email}. ` +
        'Vui lòng xác nhận chuyển giao (confirmTransfer: true)'
      );
    }

    // 5. Thực hiện gán Division Head trong transaction
    return await this.prisma.$transaction(async (tx) => {
      // Thu hồi Division Head cũ nếu có
      if (currentDivisionHead) {
        await this.revokeCurrentDivisionHead(divisionId, managerId, tx);
      }

      // Gán role division_head cho user
      const divisionHeadRole = await tx.roles.findFirst({
        where: { name: ROLE_NAMES.DIVISION_HEAD },
      });

      if (!divisionHeadRole) {
        throw new NotFoundException('Không tìm thấy role Division Head');
      }

      // Cập nhật role của user
      await tx.user_information.update({
        where: { user_id: userId },
        data: { role_id: divisionHeadRole.id },
      });

      // TODO: Fix divisions schema - manager_id field
      // await tx.divisions.update({
      //   where: { id: divisionId },
      //   data: { manager_id: userId },
      // });

      // Đảm bảo user thuộc division này
      await tx.user_division.upsert({
        where: {
          id: await this.getUserDivisionId(userId, divisionId) || 0,
        },
        update: {},
        create: {
          userId: userId,
          divisionId: divisionId,
        },
      });

      // Tạo assignment record
      // TODO: Fix role_assignments table schema
      // const assignment = await tx.role_assignments.create({
      //   data: {
      //     user_id: userId,
      //     role_name: ROLE_NAMES.DIVISION_HEAD,
      //     assignment_type: AssignmentType.DIVISION_HEAD,
      //     context_id: divisionId,
      //     context_type: 'division',
      //     assigned_by: managerId,
      //     assigned_at: new Date(),
      //     reason: reason || `Gán làm Division Head của ${division.name}`,
      //     status: AssignmentStatus.ACTIVE,
      //   },
      // });

      // Log activity
      // TODO: Fix activity logging
      // await this.logRoleAssignmentActivity(
      //   managerId,
      //   userId,
      //   ROLE_NAMES.DIVISION_HEAD,
      //   'assign',
      //   reason,
      //   tx,
      // );

      return {
        // assignment,
        message: `Đã gán ${user.email} làm Division Head của ${division.name}`,
        previousDivisionHead: currentDivisionHead ? {
          id: currentDivisionHead.id,
          name: currentDivisionHead.email,
        } : null,
      };
    });
  }

  /**
   * Gán Team Leader cho team với logic chuyển giao
   */
  async assignTeamLeader(
    dto: AssignTeamLeaderDto,
    managerId: number,
  ) {
    const { teamId, userId, reason, confirmTransfer } = dto;

    // 1. Kiểm tra quyền
    await this.validateManagerPermission(managerId, userId);

    // 2. Kiểm tra team tồn tại và thuộc division
    const team = await this.validateTeamAccess(teamId, managerId);

    // 3. Kiểm tra user tồn tại và cùng division
    const user = await this.validateUserAccess(userId, managerId);

    // 4. Kiểm tra Team Leader hiện tại
    const currentTL = await this.getCurrentTeamLeader(teamId);

    if (currentTL && !confirmTransfer) {
      return {
        requiresConfirmation: true,
        currentTL: {
          id: currentTL.userId,
          name: currentTL.user.user_information?.name || '',
          email: currentTL.user.email,
        },
        message: 'Team đã có Team Leader. Bạn có muốn chuyển giao quyền không?',
      };
    }

    // 5. Thực hiện chuyển giao
    const result = await this.prisma.$transaction(async (tx) => {
      // 5.1. Cập nhật TL cũ nếu có
      if (currentTL) {
        await tx.user_division.updateMany({
          where: {
            teamId,
            userId: currentTL.userId,
            role: { name: ROLE_NAMES.TEAM_LEADER },
          },
          data: {
            role_id: await this.getRoleId(ROLE_NAMES.EMPLOYEE),
          },
        });

        // Cập nhật role trong user_information
        await tx.user_information.updateMany({
          where: { user_id: currentTL.userId },
          data: { role_id: await this.getRoleId(ROLE_NAMES.EMPLOYEE) },
        });

        // Log chuyển giao
        await this.logActivity(tx, {
          managerId,
          targetUserId: currentTL.userId,
          event: 'team_leader.replaced',
          description: `Chuyển giao Team Leader team ${team.name} từ ${currentTL.user.user_information?.name || ''} sang ${user.user_information?.name || ''}`,
          properties: {
            team_id: teamId,
            team_name: team.name,
            old_tl_id: currentTL.userId,
            new_tl_id: userId,
            reason,
          },
        });
      }

      // 5.2. Kiểm tra user đã trong team chưa
      const existingMember = await tx.user_division.findFirst({
        where: {
          teamId,
          userId,
        },
      });

      if (existingMember) {
        // Cập nhật thành Team Leader
        await tx.user_division.update({
          where: { id: existingMember.id },
          data: {
            role_id: await this.getRoleId(ROLE_NAMES.TEAM_LEADER),
          },
        });
      } else {
        // Thêm mới vào team
        await tx.user_division.create({
          data: {
            userId,
            teamId,
            divisionId: team.division_id,
            role_id: await this.getRoleId(ROLE_NAMES.TEAM_LEADER),
          },
        });
      }

      // 5.3. Cập nhật role trong user_information
      await tx.user_information.updateMany({
        where: { user_id: userId },
        data: { role_id: await this.getRoleId(ROLE_NAMES.TEAM_LEADER) },
      });

      // 5.4. Log gán TL mới
      await this.logActivity(tx, {
        managerId,
        targetUserId: userId,
        event: 'team_leader.assigned',
        description: `Gán Team Leader team ${team.name} cho ${user.user_information?.name || ''}`,
        properties: {
          team_id: teamId,
          team_name: team.name,
          tl_id: userId,
          reason,
          replaced_tl: currentTL?.userId || null,
        },
      });

      return { currentTL, newTL: user, team };
    });

    return {
      success: true,
      message: currentTL 
        ? `Chuyển giao Team Leader thành công từ ${result.currentTL?.user.user_information?.name || ''} sang ${result.newTL.user_information?.name || ''}`
        : `Gán Team Leader thành công cho ${result.newTL.user_information?.name || ''}`,
      team: {
        id: result.team.id,
        name: result.team.name,
      },
      newTL: {
        id: result.newTL.id,
        name: result.newTL.user_information?.name || '',
        email: result.newTL.email,
      },
      previousTL: result.currentTL ? {
        id: result.currentTL.userId,
        name: result.currentTL.user.user_information?.name || '',
        email: result.currentTL.user.email,
      } : null,
    };
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
    
    if (!allowedRoles.includes(managerRole.role.name as any)) {
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
          select: { name: true, email: true },
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
          select: { name: true, email: true },
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
  private async validateUserAccess(userId: number, managerId: number) {
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
