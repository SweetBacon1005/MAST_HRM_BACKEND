import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PrismaService } from '../../database/prisma.service';
import {
  ROLE_NAMES,
  PROJECT_POSITIONS,
  ACTIVE_PROJECT_STATUSES,
  DIVISION_HEAD_ASSIGNABLE_ROLES,
} from '../constants/role.constants';

export interface RoleHierarchy {
  level: number;
  name: string;
  canManage: string[];
}

@Injectable()
export class RoleHierarchyService {
  constructor(
    @Inject(forwardRef(() => PermissionService))
    private readonly permissionService: PermissionService,
    private readonly prisma: PrismaService,
  ) {}

  private async getProjectIdsInDivision(divisionId: number): Promise<number[]> {
    const projects = await this.prisma.projects.findMany({
      where: {
        division_id: divisionId,
        deleted_at: null
      },
      select: { id: true }
    });
    return projects.map(p => p.id);
  }

  // Định nghĩa cấp bậc vai trò từ thấp đến cao
  private readonly roleHierarchy: RoleHierarchy[] = [
    {
      level: 1,
      name: ROLE_NAMES.EMPLOYEE,
      canManage: [],
    },
    {
      level: 2,
      name: ROLE_NAMES.TEAM_LEADER,
      canManage: [ROLE_NAMES.EMPLOYEE],
    },
    {
      level: 3,
      name: ROLE_NAMES.DIVISION_HEAD,
      canManage: [ROLE_NAMES.EMPLOYEE, ROLE_NAMES.TEAM_LEADER],
    },
    {
      level: 4,
      name: ROLE_NAMES.PROJECT_MANAGER,
      canManage: [ROLE_NAMES.EMPLOYEE, ROLE_NAMES.TEAM_LEADER],
    },
    {
      level: 5,
      name: ROLE_NAMES.HR_MANAGER,
      canManage: [
        ROLE_NAMES.EMPLOYEE,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.DIVISION_HEAD,
        ROLE_NAMES.PROJECT_MANAGER,
      ],
    },
    {
      level: 6,
      name: ROLE_NAMES.ADMIN,
      canManage: [
        ROLE_NAMES.EMPLOYEE,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.DIVISION_HEAD,
        ROLE_NAMES.PROJECT_MANAGER,
        ROLE_NAMES.HR_MANAGER,
      ],
    },
    {
      level: 7,
      name: ROLE_NAMES.SUPER_ADMIN,
      canManage: [
        ROLE_NAMES.EMPLOYEE,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.DIVISION_HEAD,
        ROLE_NAMES.PROJECT_MANAGER,
        ROLE_NAMES.HR_MANAGER,
        ROLE_NAMES.ADMIN,
      ],
    },
  ];

  /**
   * Lấy thông tin cấp bậc của một role
   */
  getRoleHierarchy(roleName: string): RoleHierarchy | null {
    return this.roleHierarchy.find((role) => role.name === roleName) || null;
  }

  /**
   * Kiểm tra role A có thể quản lý role B không
   */
  canManageRole(managerRole: string, targetRole: string): boolean {
    const manager = this.getRoleHierarchy(managerRole);
    if (!manager) return false;

    return manager.canManage.includes(targetRole);
  }

  /**
   * Lấy danh sách các role mà một role có thể quản lý
   */
  getManageableRoles(roleName: string): string[] {
    const role = this.getRoleHierarchy(roleName);
    return role ? role.canManage : [];
  }

  async canUserManageUserRole(
    managerId: number,
    targetUserId: number,
    newRoleName?: string,
  ): Promise<boolean> {
    const managerRole = await this.permissionService.getUserRole(managerId);
    if (!managerRole) return false;

    if (managerRole.name !== ROLE_NAMES.DIVISION_HEAD) {
      const targetRole = await this.permissionService.getUserRole(targetUserId);
      if (!targetRole) return false;

      const canManageCurrentRole = this.canManageRole(
        managerRole.name,
        targetRole.name,
      );
      if (!canManageCurrentRole) return false;

      if (newRoleName) {
        const canManageNewRole = this.canManageRole(
          managerRole.name,
          newRoleName,
        );
        if (!canManageNewRole) return false;
      }
      return true;
    }

    // Logic đặc biệt cho division_head
    return await this.canDivisionHeadManageUser(
      managerId,
      targetUserId,
      newRoleName,
    );
  }

  /**
   * Kiểm tra trưởng phòng có thể gán role cho nhân viên không
   */
  private async canDivisionHeadManageUser(
    divisionHeadId: number,
    targetUserId: number,
    newRoleName?: string,
  ): Promise<boolean> {
    // 1. Kiểm tra cả hai có cùng division không
    const [managerDivision, targetDivision] = await Promise.all([
      this.prisma.user_division.findFirst({
        where: { userId: divisionHeadId },
        include: { division: true },
      }),
      this.prisma.user_division.findFirst({
        where: { userId: targetUserId },
        include: { division: true },
      }),
    ]);

    if (
      !managerDivision ||
      !targetDivision ||
      managerDivision.divisionId !== targetDivision.divisionId
    ) {
      return false; // Không cùng phòng ban
    }

    // 2. Kiểm tra role được gán có hợp lệ không
    if (newRoleName) {
      // Chỉ cho phép gán team_leader hoặc project_manager
      if (!DIVISION_HEAD_ASSIGNABLE_ROLES.includes(newRoleName as any)) {
        return false;
      }

      // 3. Kiểm tra ràng buộc đặc biệt cho project_manager
      if (newRoleName === ROLE_NAMES.PROJECT_MANAGER) {
        const hasProjectInDivision = await this.prisma.user_role_assignment.findFirst(
          {
            where: {
              user_id: targetUserId,
              scope_type: 'PROJECT',
              role: {
                name: 'project_manager',
                deleted_at: null
              },
              deleted_at: null,
              // Check if project belongs to manager's division
              scope_id: {
                in: await this.getProjectIdsInDivision(managerDivision.divisionId || 0)
              },
            },
          },
        );

        if (!hasProjectInDivision) {
          return false; // Không tham gia dự án nào trong phòng ban
        }

        // Kiểm tra không được là PM chính của nhiều project cùng lúc
        // PM có thể tham gia nhiều dự án nhưng chỉ được là PM chính của 1 dự án
        const currentPMProjects = await this.prisma.user_role_assignment.count({
          where: {
            user_id: targetUserId,
            scope_type: 'PROJECT',
            role: {
              name: 'project_manager',
              deleted_at: null
            },
            deleted_at: null
          }
        });

        // Cho phép gán PM nếu chưa là PM chính của dự án nào
        // hoặc nếu đang gán lại role PM cho cùng 1 user (update role)
        if (currentPMProjects > 1) {
          return false; // Đã là PM chính của nhiều dự án (không hợp lệ)
        }
      }

      // 4. Kiểm tra xung đột role team_leader vs project_manager
      if (newRoleName === ROLE_NAMES.TEAM_LEADER) {
        const currentRole = await this.permissionService.getUserRole(targetUserId);
        if (currentRole?.name === ROLE_NAMES.PROJECT_MANAGER) {
          // Kiểm tra có xung đột về dự án không
          const conflictingProjects = await this.prisma.user_role_assignment.count({
            where: {
              user_id: targetUserId,
              scope_type: 'PROJECT',
              role: {
                name: 'project_manager',
                deleted_at: null
              },
              deleted_at: null
            }
          });

          if (conflictingProjects > 0) {
            return false; // Xung đột: đang là PM của dự án trong team mình sẽ lead
          }
        }
      }
    }

    return true;
  }

  private async getUserTeamIds(userId: number): Promise<number[]> {
    const userTeams = await this.prisma.user_division.findMany({
      where: {
        userId,
      },
      select: { divisionId: true },
    });

    return userTeams.map((ut) => ut.divisionId).filter((id): id is number => id !== null);
  }

  getRoleManagementPermissions(roleName: string): string[] {
    const manageableRoles = this.getManageableRoles(roleName);
    const permissions: string[] = ['role.read'];

    manageableRoles.forEach((role) => {
      permissions.push(`role.manage.${role}`);
    });

    return permissions;
  }

  async hasRoleManagementPermission(
    userId: number,
    targetRoleName: string,
  ): Promise<boolean> {
    const requiredPermission = `role.manage.${targetRoleName}`;
    return await this.permissionService.hasPermission(
      userId,
      requiredPermission,
    );
  }

  async getAssignableRoles(userId: number): Promise<string[]> {
    const userRole = await this.permissionService.getUserRole(userId);
    if (!userRole) return [];

    const manageableRoles = this.getManageableRoles(userRole.name);
    const assignableRoles: string[] = [];

    for (const role of manageableRoles) {
      const hasPermission = await this.hasRoleManagementPermission(
        userId,
        role,
      );
      if (hasPermission) {
        assignableRoles.push(role);
      }
    }

    return assignableRoles;
  }

  async canApprovePersonnelTransfer(
    approverId: number,
    transferUserId: number,
  ): Promise<boolean> {
    const hasApprovePermission = await this.permissionService.hasPermission(
      approverId,
      'personnel.transfer.approve',
    );
    if (!hasApprovePermission) return false;

    const approverRole = await this.permissionService.getUserRole(approverId);
    const transferUserRole =
      await this.permissionService.getUserRole(transferUserId);

    if (!approverRole || !transferUserRole) return false;

    return this.canManageRole(approverRole.name, transferUserRole.name);
  }

  getRoleLevel(roleName: string): number {
    const role = this.getRoleHierarchy(roleName);
    return role ? role.level : 0;
  }

  compareRoleLevel(role1: string, role2: string): number {
    const level1 = this.getRoleLevel(role1);
    const level2 = this.getRoleLevel(role2);
    return level1 - level2;
  }

  isHigherRole(role1: string, role2: string): boolean {
    return this.compareRoleLevel(role1, role2) > 0;
  }

  getAllRolesByHierarchy(): RoleHierarchy[] {
    return [...this.roleHierarchy].sort((a, b) => a.level - b.level);
  }

  getLowerRoles(roleName: string): string[] {
    const role = this.getRoleHierarchy(roleName);
    if (!role) return [];

    return this.roleHierarchy
      .filter((r) => r.level < role.level)
      .map((r) => r.name);
  }

  getHigherRoles(roleName: string): string[] {
    const role = this.getRoleHierarchy(roleName);
    if (!role) return [];

    return this.roleHierarchy
      .filter((r) => r.level > role.level)
      .map((r) => r.name);
  }
}
