import { Injectable } from '@nestjs/common';
import { PermissionService } from './permission.service';

export interface RoleHierarchy {
  level: number;
  name: string;
  canManage: string[];
}

@Injectable()
export class RoleHierarchyService {
  constructor(private readonly permissionService: PermissionService) {}

  // Định nghĩa cấp bậc vai trò từ thấp đến cao
  private readonly roleHierarchy: RoleHierarchy[] = [
    {
      level: 1,
      name: 'employee',
      canManage: [],
    },
    {
      level: 2,
      name: 'team_leader',
      canManage: ['employee'],
    },
    {
      level: 3,
      name: 'division_head',
      canManage: ['employee', 'team_leader'],
    },
    {
      level: 4,
      name: 'project_manager',
      canManage: ['employee', 'team_leader'],
    },
    {
      level: 5,
      name: 'hr_manager',
      canManage: [
        'employee',
        'team_leader',
        'division_head',
        'project_manager',
      ],
    },
    {
      level: 6,
      name: 'admin',
      canManage: [
        'employee',
        'team_leader',
        'division_head',
        'project_manager',
        'hr_manager',
      ],
    },
    {
      level: 7,
      name: 'super_admin',
      canManage: [
        'employee',
        'team_leader',
        'division_head',
        'project_manager',
        'hr_manager',
        'admin',
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

  /**
   * Kiểm tra user có thể sửa role của user khác không
   */
  async canUserManageUserRole(
    managerId: number,
    targetUserId: number,
    newRoleName?: string,
  ): Promise<boolean> {
    // Lấy role của manager
    const managerRole = await this.permissionService.getUserRole(managerId);
    if (!managerRole) return false;

    // Lấy role hiện tại của target user
    const targetRole = await this.permissionService.getUserRole(targetUserId);
    if (!targetRole) return false;

    // Kiểm tra manager có thể quản lý role hiện tại của target không
    const canManageCurrentRole = this.canManageRole(
      managerRole.name,
      targetRole.name,
    );
    if (!canManageCurrentRole) return false;

    // Nếu có role mới, kiểm tra manager có thể gán role mới không
    if (newRoleName) {
      const canManageNewRole = this.canManageRole(
        managerRole.name,
        newRoleName,
      );
      if (!canManageNewRole) return false;
    }

    return true;
  }

  /**
   * Lấy danh sách permissions để quản lý role theo cấp bậc
   */
  getRoleManagementPermissions(roleName: string): string[] {
    const manageableRoles = this.getManageableRoles(roleName);
    const permissions: string[] = ['role.read'];

    manageableRoles.forEach((role) => {
      permissions.push(`role.manage.${role}`);
    });

    return permissions;
  }

  /**
   * Kiểm tra user có permission để quản lý một role cụ thể không
   */
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

  /**
   * Lấy danh sách roles mà user có thể gán cho người khác
   */
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

  /**
   * Kiểm tra user có thể phê duyệt điều chuyển nhân sự không
   */
  async canApprovePersonnelTransfer(
    approverId: number,
    transferUserId: number,
  ): Promise<boolean> {
    // Kiểm tra quyền phê duyệt điều chuyển
    const hasApprovePermission = await this.permissionService.hasPermission(
      approverId,
      'personnel.transfer.approve',
    );
    if (!hasApprovePermission) return false;

    // Lấy role của approver và user được điều chuyển
    const approverRole = await this.permissionService.getUserRole(approverId);
    const transferUserRole =
      await this.permissionService.getUserRole(transferUserId);

    if (!approverRole || !transferUserRole) return false;

    // Kiểm tra approver có thể quản lý role của user được điều chuyển không
    return this.canManageRole(approverRole.name, transferUserRole.name);
  }

  /**
   * Lấy level của role
   */
  getRoleLevel(roleName: string): number {
    const role = this.getRoleHierarchy(roleName);
    return role ? role.level : 0;
  }

  /**
   * So sánh level giữa hai role
   */
  compareRoleLevel(role1: string, role2: string): number {
    const level1 = this.getRoleLevel(role1);
    const level2 = this.getRoleLevel(role2);
    return level1 - level2;
  }

  /**
   * Kiểm tra role1 có cấp cao hơn role2 không
   */
  isHigherRole(role1: string, role2: string): boolean {
    return this.compareRoleLevel(role1, role2) > 0;
  }

  /**
   * Lấy tất cả roles theo thứ tự cấp bậc
   */
  getAllRolesByHierarchy(): RoleHierarchy[] {
    return [...this.roleHierarchy].sort((a, b) => a.level - b.level);
  }

  /**
   * Lấy roles có cấp thấp hơn role được chỉ định
   */
  getLowerRoles(roleName: string): string[] {
    const role = this.getRoleHierarchy(roleName);
    if (!role) return [];

    return this.roleHierarchy
      .filter((r) => r.level < role.level)
      .map((r) => r.name);
  }

  /**
   * Lấy roles có cấp cao hơn role được chỉ định
   */
  getHigherRoles(roleName: string): string[] {
    const role = this.getRoleHierarchy(roleName);
    if (!role) return [];

    return this.roleHierarchy
      .filter((r) => r.level > role.level)
      .map((r) => r.name);
  }
}
