import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ScopeType } from '@prisma/client';

export interface RoleAssignmentData {
  user_id: number;
  role_id: number;
  scope_type: ScopeType;
  scope_id?: number;
  assigned_by: number;
}

export interface UserRoleContext {
  user_id: number;
  roles: {
    id: number;
    name: string;
    scope_type: ScopeType;
    scope_id?: number;
  }[];
}

@Injectable()
export class RoleAssignmentService {
  constructor(private prisma: PrismaService) {}

  async assignRole(data: RoleAssignmentData) {
    await this.validateScope(data.scope_type, data.scope_id);

    const role = await this.prisma.roles.findFirst({
      where: { id: data.role_id, deleted_at: null }
    });
    if (!role) {
      throw new NotFoundException('Role không tồn tại');
    }

    const user = await this.prisma.users.findFirst({
      where: { id: data.user_id, deleted_at: null }
    });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    const existingAssignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: data.user_id,
        role_id: data.role_id,
        scope_type: data.scope_type,
        scope_id: data.scope_id,
        deleted_at: null
      }
    });

    if (existingAssignment) {
      throw new ConflictException('User đã có role này trong context này');
    }


    return await this.prisma.user_role_assignment.create({
      data: {
        user_id: data.user_id,
        role_id: data.role_id,
        scope_type: data.scope_type,
        scope_id: data.scope_id,
        assigned_by: data.assigned_by
      },
      include: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true }
            }
          }
        }
      }
    });
  }

  /**
   * Xóa role assignment
   */
  async revokeRole(userId: number, roleId: number, scopeType: ScopeType, scopeId?: number) {
    const assignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: userId,
        role_id: roleId,
        scope_type: scopeType,
        scope_id: scopeId,
        deleted_at: null
      }
    });

    if (!assignment) {
      throw new NotFoundException('Role assignment không tồn tại');
    }

    // Soft delete
    return await this.prisma.user_role_assignment.update({
      where: { id: assignment.id },
      data: { deleted_at: new Date() }
    });
  }

  async getUserRoles(userId: number): Promise<UserRoleContext> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: userId,
        deleted_at: null
      },
      include: {
        role: true
      },
      orderBy: [
        { scope_type: 'asc' },
        { created_at: 'desc' }
      ]
    });

    return {
      user_id: userId,
      roles: assignments.map(assignment => ({
        id: assignment.role.id,
        name: assignment.role.name,
        scope_type: assignment.scope_type,
        scope_id: assignment.scope_id ?? undefined,
      }))
    };
  }

  async getUserRolesByScope(userId: number, scopeType: ScopeType, scopeId?: number) {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: userId,
        scope_type: scopeType,
        scope_id: scopeId,
        deleted_at: null
      },
      include: {
        role: true
      },
      orderBy: [
        { created_at: 'desc' }
      ]
    });

    return assignments.map(assignment => ({
      id: assignment.role.id,
      name: assignment.role.name,
      assigned_at: assignment.created_at
    }));
  }

  /**
   * Lấy primary role của user trong scope cụ thể
   */
  async getUserPrimaryRole(userId: number, scopeType: ScopeType, scopeId?: number) {
    const assignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: userId,
        scope_type: scopeType,
        scope_id: scopeId,
        deleted_at: null
      },
      include: {
        role: true
      }
    });

    return assignment ? {
      id: assignment.role.id,
      name: assignment.role.name,
      scope_type: assignment.scope_type,
      scope_id: assignment.scope_id
    } : null;
  }

  /**
   * Kiểm tra user có role cụ thể trong scope không
   */
  async hasRole(userId: number, roleName: string, scopeType: ScopeType, scopeId?: number): Promise<boolean> {
    const assignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: userId,
        scope_type: scopeType,
        scope_id: scopeId,
        deleted_at: null,
        role: {
          name: roleName,
          deleted_at: null
        }
      }
    });

    return !!assignment;
  }

  /**
   * Kiểm tra user có bất kỳ role nào trong danh sách roles
   */
  async hasAnyRole(userId: number, roleNames: string[], scopeType: ScopeType, scopeId?: number): Promise<boolean> {
    const assignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: userId,
        scope_type: scopeType,
        scope_id: scopeId,
        deleted_at: null,
        role: {
          name: { in: roleNames },
          deleted_at: null
        }
      }
    });

    return !!assignment;
  }

  /**
   * Lấy tất cả users có role cụ thể trong scope
   */
  async getUsersByRole(roleName: string, scopeType: ScopeType, scopeId?: number) {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: scopeType,
        scope_id: scopeId,
        deleted_at: null,
        role: {
          name: roleName,
          deleted_at: null
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true, avatar: true }
            }
          }
        },
        role: true
      },
      orderBy: [
        { created_at: 'desc' }
      ]
    });

    return assignments.map(assignment => ({
      user_id: assignment.user.id,
      email: assignment.user.email,
      name: assignment.user.user_information?.name,
      avatar: assignment.user.user_information?.avatar,
      role_name: assignment.role.name,
      assigned_at: assignment.created_at
    }));
  }

  /**
   * Bulk assign roles cho multiple users
   */
  async bulkAssignRoles(assignments: RoleAssignmentData[]) {
    const results: Array<{
      success: boolean;
      data?: any;
      error?: string;
      assignment?: RoleAssignmentData;
    }> = [];
    
    for (const assignment of assignments) {
      try {
        const result = await this.assignRole(assignment);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          assignment: assignment 
        });
      }
    }

    return results;
  }

  /**
   * Validate scope type và scope id
   */
  private async validateScope(scopeType: ScopeType, scopeId?: number) {
    switch (scopeType) {
      case ScopeType.COMPANY:
        break;
      
      case ScopeType.DIVISION: {
        if (!scopeId) {
          throw new BadRequestException('Division scope cần scope_id');
        }
        const division = await this.prisma.divisions.findFirst({
          where: { id: scopeId, deleted_at: null }
        });
        if (!division) {
          throw new NotFoundException('Division không tồn tại');
        }
        break;
      }
      
      case ScopeType.TEAM: {
        if (!scopeId) {
          throw new BadRequestException('Team scope cần scope_id');
        }
        const team = await this.prisma.teams.findFirst({
          where: { id: scopeId, deleted_at: null }
        });
        if (!team) {
          throw new NotFoundException('Team không tồn tại');
        }
        break;
      }
      
      case ScopeType.PROJECT: {
        if (!scopeId) {
          throw new BadRequestException('Project scope cần scope_id');
        }
        const project = await this.prisma.projects.findFirst({
          where: { id: scopeId, deleted_at: null }
        });
    if (!project) {
          throw new NotFoundException('Project không tồn tại');
        }
        break;
      }
      
      default:
        throw new BadRequestException('Scope type không hợp lệ');
    }
  }

  async getRoleHierarchy(userId: number, scopeType: ScopeType, scopeId?: number) {
    const userRoles = await this.getUserRolesByScope(userId, scopeType, scopeId);
    
    const roleHierarchy = {
      'Admin': 100,
      'Manager': 80,
      'Team Lead': 60,
      'Senior Developer': 50,
      'Developer': 40,
      'Intern': 20
    };

    const userRoleNames = userRoles.map(role => role.name);
    const maxLevel = Math.max(...userRoleNames.map(name => roleHierarchy[name] || 0));

    return {
      user_id: userId,
      max_role_level: maxLevel,
      roles: userRoles,
      inherited_permissions: this.getInheritedPermissions(maxLevel, roleHierarchy)
    };
  }

  private getInheritedPermissions(userLevel: number, roleHierarchy: Record<string, number>) {
    return Object.keys(roleHierarchy)
      .filter(roleName => roleHierarchy[roleName] <= userLevel)
      .sort((a, b) => roleHierarchy[b] - roleHierarchy[a]);
  }

  /**
   * Gán PM mới cho project - thay thế PM cũ nếu có
   */
  async assignProjectManager(projectId: number, newUserId: number, assignedBy: number) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Tìm PM hiện tại trong project
      const currentPM = await tx.user_role_assignment.findFirst({
        where: {
          scope_type: ScopeType.PROJECT,
          scope_id: projectId,
          role: {
            name: 'project_manager',
            deleted_at: null
          },
          deleted_at: null
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: { name: true }
              }
            }
          },
          role: true
        }
      });

      let replacedUser: any = null;

      // 2. Nếu có PM cũ, xóa mềm
      if (currentPM) {
        await tx.user_role_assignment.update({
          where: { id: currentPM.id },
          data: { deleted_at: new Date() }
        });
        replacedUser = currentPM.user;
      }

      // 3. Lấy role PM
      const pmRole = await tx.roles.findFirst({
        where: { name: 'project_manager', deleted_at: null }
      });

      if (!pmRole) {
        throw new NotFoundException('Role project_manager không tồn tại');
      }

      // 4. Gán PM mới
      const newAssignment = await tx.user_role_assignment.create({
        data: {
          user_id: newUserId,
          role_id: pmRole.id,
          scope_type: ScopeType.PROJECT,
          scope_id: projectId,
          assigned_by: assignedBy
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: { name: true }
              }
            }
          },
          role: true
        }
      });

      // 5. Ghi log
      await this.logRoleChange(
        tx,
        newUserId,
        'role.assigned',
        `Gán PM cho project ${projectId}`,
        assignedBy,
        {
          project_id: projectId,
          new_role: 'project_manager',
          replaced_user: replacedUser ? {
            id: replacedUser.id,
            name: replacedUser.user_information?.[0]?.name || null,
            email: replacedUser.email
          } : null
        }
      );

      return {
        newAssignment,
        replacedUser
      };
    });
  }

  /**
   * Giáng chức PM khỏi project
   */
  async demoteProjectManager(projectId: number, userId: number, demotedBy: number) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Tìm và xóa role PM trong project
      const pmAssignment = await tx.user_role_assignment.findFirst({
        where: {
          user_id: userId,
          scope_type: ScopeType.PROJECT,
          scope_id: projectId,
          role: {
            name: 'project_manager',
            deleted_at: null
          },
          deleted_at: null
        }
      });

      if (!pmAssignment) {
        throw new NotFoundException('User không phải PM của project này');
      }

      // Xóa mềm assignment
      await tx.user_role_assignment.update({
        where: { id: pmAssignment.id },
        data: { deleted_at: new Date() }
      });

      // 2. Kiểm tra user còn role nào khác không
      const remainingRoles = await tx.user_role_assignment.findMany({
        where: {
          user_id: userId,
          deleted_at: null
        },
        include: {
          role: true
        }
      });

      let autoAssignedEmployee: any = null;

      // 3. Nếu không còn role nào, tự động gán role employee
      if (remainingRoles.length === 0) {
        const employeeRole = await tx.roles.findFirst({
          where: { name: 'employee', deleted_at: null }
        });

        if (employeeRole) {
          autoAssignedEmployee = await tx.user_role_assignment.create({
            data: {
              user_id: userId,
              role_id: employeeRole.id,
              scope_type: ScopeType.COMPANY,
              assigned_by: demotedBy
            }
          });
        }
      }

      // 4. Ghi log
      await this.logRoleChange(
        tx,
        userId,
        'role.revoked',
        `Giáng chức PM khỏi project ${projectId}`,
        demotedBy,
        {
          project_id: projectId,
          revoked_role: 'project_manager',
          auto_assigned_employee: !!autoAssignedEmployee
        }
      );

      return {
        revokedAssignment: pmAssignment,
        remainingRoles: remainingRoles.map(r => r.role.name),
        autoAssignedEmployee
      };
    });
  }

  async assignRoleUnified(
    targetUserIds: number[],
    roleId: number,
    assignedBy: number,
    context?: {
      projectId?: number;
      teamId?: number;
      divisionId?: number;
    }
  ) {
    const results: any[] = [];

    for (const userId of targetUserIds) {
      try {
        const result = await this.assignRoleToUser(userId, roleId, assignedBy, context);
        results.push({
          userId,
          success: true,
          ...result
        });
      } catch (error: any) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      results,
      summary: {
        total: targetUserIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }

  private async assignRoleToUser(
    userId: number,
    roleId: number,
    assignedBy: number,
    context?: {
      projectId?: number;
      teamId?: number;
      divisionId?: number;
    }
  ) {
    const role = await this.prisma.roles.findFirst({
      where: { id: roleId, deleted_at: null }
    });

    if (!role) {
      throw new NotFoundException('Role không tồn tại');
    }

    switch (role.name) {
      case 'project_manager':
        if (!context?.projectId) {
          throw new BadRequestException('Role project_manager yêu cầu projectId');
        }
        return await this.assignProjectManager(context.projectId, userId, assignedBy);

      case 'team_leader':
        if (!context?.teamId) {
          throw new BadRequestException('Role team_leader yêu cầu teamId');
        }
        return await this.assignTeamLeader(context.teamId, userId, assignedBy);

      case 'division_head':
        if (!context?.divisionId) {
          throw new BadRequestException('Role division_head yêu cầu divisionId');
        }
        return await this.assignDivisionHead(context.divisionId, userId, assignedBy);

      default:
        // Gán role thông thường
        return await this.assignGeneralRole(userId, roleId, assignedBy, context);
    }
  }

  /**
   * Gán Team Leader
   */
  private async assignTeamLeader(teamId: number, newUserId: number, assignedBy: number) {
    return await this.prisma.$transaction(async (tx) => {
      // Tìm team leader hiện tại
      const currentLeader = await tx.user_role_assignment.findFirst({
        where: {
          scope_type: ScopeType.TEAM,
          scope_id: teamId,
          role: {
            name: 'team_leader',
            deleted_at: null
          },
          deleted_at: null
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } }
            }
          }
        }
      });

      let replacedUser: any = null;

      // Xóa leader cũ nếu có
      if (currentLeader) {
        await tx.user_role_assignment.update({
          where: { id: currentLeader.id },
          data: { deleted_at: new Date() }
        });
        replacedUser = currentLeader.user;
      }

      // Gán leader mới
      const teamLeaderRole = await tx.roles.findFirst({
        where: { name: 'team_leader', deleted_at: null }
      });

      if (!teamLeaderRole) {
        throw new NotFoundException('Role team_leader không tồn tại');
      }

      const newAssignment = await tx.user_role_assignment.create({
        data: {
          user_id: newUserId,
          role_id: teamLeaderRole.id,
          scope_type: ScopeType.TEAM,
          scope_id: teamId,
          assigned_by: assignedBy
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } }
            }
          },
          role: true
        }
      });

      // Ghi log
      await this.logRoleChange(
        tx,
        newUserId,
        'role.assigned',
        `Gán Team Leader cho team ${teamId}`,
        assignedBy,
        {
          team_id: teamId,
          new_role: 'team_leader',
          replaced_user: replacedUser ? {
            id: replacedUser.id,
            name: replacedUser.user_information?.[0]?.name || null,
            email: replacedUser.email
          } : null
        }
      );

      return { newAssignment, replacedUser };
    });
  }

  /**
   * Gán Division Head
   */
  private async assignDivisionHead(divisionId: number, newUserId: number, assignedBy: number) {
    return await this.prisma.$transaction(async (tx) => {
      // Tìm division head hiện tại
      const currentHead = await tx.user_role_assignment.findFirst({
        where: {
          scope_type: ScopeType.DIVISION,
          scope_id: divisionId,
          role: {
            name: 'division_head',
            deleted_at: null
          },
          deleted_at: null
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } }
            }
          }
        }
      });

      let replacedUser: any = null;

      // Xóa head cũ nếu có
      if (currentHead) {
        await tx.user_role_assignment.update({
          where: { id: currentHead.id },
          data: { deleted_at: new Date() }
        });
        replacedUser = currentHead.user;
      }

      // Gán head mới
      const divisionHeadRole = await tx.roles.findFirst({
        where: { name: 'division_head', deleted_at: null }
      });

      if (!divisionHeadRole) {
        throw new NotFoundException('Role division_head không tồn tại');
      }

      const newAssignment = await tx.user_role_assignment.create({
        data: {
          user_id: newUserId,
          role_id: divisionHeadRole.id,
          scope_type: ScopeType.DIVISION,
          scope_id: divisionId,
          assigned_by: assignedBy
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } }
            }
          },
          role: true
        }
      });

      // Ghi log
      await this.logRoleChange(
        tx,
        newUserId,
        'role.assigned',
        `Gán Division Head cho division ${divisionId}`,
        assignedBy,
        {
          division_id: divisionId,
          new_role: 'division_head',
          replaced_user: replacedUser ? {
            id: replacedUser.id,
            name: replacedUser.user_information?.[0]?.name || null,
            email: replacedUser.email
          } : null
        }
      );

      return { newAssignment, replacedUser };
    });
  }

  /**
   * Gán role thông thường (employee, etc.)
   */
  private async assignGeneralRole(
    userId: number,
    roleId: number,
    assignedBy: number,
    context?: {
      projectId?: number;
      teamId?: number;
      divisionId?: number;
    }
  ) {
    // Xác định scope
    let scopeType: ScopeType = ScopeType.COMPANY;
    let scopeId: number | undefined = undefined;

    if (context?.projectId) {
      scopeType = ScopeType.PROJECT;
      scopeId = context.projectId;
    } else if (context?.teamId) {
      scopeType = ScopeType.TEAM;
      scopeId = context.teamId;
    } else if (context?.divisionId) {
      scopeType = ScopeType.DIVISION;
      scopeId = context.divisionId;
    }

    return await this.assignRole({
      user_id: userId,
      role_id: roleId,
      scope_type: scopeType,
      scope_id: scopeId,
      assigned_by: assignedBy
    });
  }

  /**
   * Ghi log thay đổi role
   */
  private async logRoleChange(
    tx: any,
    userId: number,
    event: string,
    description: string,
    causerId: number,
    properties: any
  ) {
    await tx.activity_log.create({
      data: {
        subject_type: 'users',
        subject_id: userId,
        causer_type: 'users',
        causer_id: causerId,
        event,
        description,
        properties: JSON.stringify(properties)
      }
    });
  }
}