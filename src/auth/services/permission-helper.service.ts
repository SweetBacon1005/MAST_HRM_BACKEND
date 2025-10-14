import { Injectable } from '@nestjs/common';
import { PermissionService } from './permission.service';

@Injectable()
export class PermissionHelperService {
  constructor(private readonly permissionService: PermissionService) {}

  /**
   * Kiểm tra user có thể truy cập resource của user khác không
   * @param currentUserId - ID của user hiện tại
   * @param targetUserId - ID của user target
   * @param requiredPermission - Permission cần thiết để truy cập user khác
   * @returns Promise<boolean>
   */
  async canAccessUserResource(
    currentUserId: number,
    targetUserId: number,
    requiredPermission: string,
  ): Promise<boolean> {
    // Nếu truy cập resource của chính mình, luôn cho phép
    if (currentUserId === targetUserId) {
      return true;
    }

    // Nếu truy cập resource của user khác, cần permission
    return await this.permissionService.hasPermission(currentUserId, requiredPermission);
  }

  /**
   * Kiểm tra user có thể quản lý (approve/reject) requests không
   * @param userId - ID của user
   * @returns Promise<boolean>
   */
  async canManageRequests(userId: number): Promise<boolean> {
    return await this.permissionService.hasAnyPermission(userId, [
      'request.approve',
      'request.reject',
    ]);
  }

  /**
   * Kiểm tra user có thể xem thống kê không
   * @param userId - ID của user
   * @returns Promise<boolean>
   */
  async canViewStatistics(userId: number): Promise<boolean> {
    return await this.permissionService.hasAnyPermission(userId, [
      'timesheet.statistics',
      'attendance.statistics',
      'analytics.view',
    ]);
  }

  /**
   * Kiểm tra user có thể quản lý nhân viên không
   * @param userId - ID của user
   * @returns Promise<boolean>
   */
  async canManageUsers(userId: number): Promise<boolean> {
    return await this.permissionService.hasAnyPermission(userId, [
      'user.create',
      'user.update',
      'user.delete',
    ]);
  }

  /**
   * Kiểm tra user có thể quản lý dự án không
   * @param userId - ID của user
   * @returns Promise<boolean>
   */
  async canManageProjects(userId: number): Promise<boolean> {
    return await this.permissionService.hasAnyPermission(userId, [
      'project.create',
      'project.update',
      'project.delete',
      'project.assign',
    ]);
  }

  /**
   * Kiểm tra user có thể quản lý tổ chức không
   * @param userId - ID của user
   * @returns Promise<boolean>
   */
  async canManageOrganization(userId: number): Promise<boolean> {
    return await this.permissionService.hasAnyPermission(userId, [
      'organization.manage',
      'division.manage',
      'team.manage',
    ]);
  }

  /**
   * Lấy danh sách permissions được nhóm theo category
   * @param userId - ID của user
   * @returns Promise<{[category: string]: string[]}>
   */
  async getGroupedPermissions(userId: number): Promise<{[category: string]: string[]}> {
    const permissions = await this.permissionService.getUserPermissions(userId);
    
    const grouped: {[category: string]: string[]} = {};
    
    permissions.forEach(permission => {
      const [category] = permission.split('.');
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(permission);
    });

    return grouped;
  }

  /**
   * Kiểm tra user có phải là manager level không
   * @param userId - ID của user
   * @returns Promise<boolean>
   */
  async isManagerLevel(userId: number): Promise<boolean> {
    const role = await this.permissionService.getUserRole(userId);
    
    const managerRoles = [
      'super_admin',
      'admin', 
      'hr_manager',
      'project_manager',
      'division_head',
      'team_leader'
    ];

    return role ? managerRoles.includes(role.name) : false;
  }

  /**
   * Kiểm tra user có thể duyệt requests của user khác không
   * @param approverId - ID của người duyệt
   * @param requesterId - ID của người tạo request
   * @returns Promise<boolean>
   */
  async canApproveUserRequest(approverId: number, requesterId: number): Promise<boolean> {
    // Không thể tự duyệt request của mình
    if (approverId === requesterId) {
      return false;
    }

    // Cần có quyền approve và phải là manager level
    const canApprove = await this.permissionService.hasPermission(approverId, 'request.approve');
    const isManager = await this.isManagerLevel(approverId);

    return canApprove && isManager;
  }

  /**
   * Lấy menu permissions cho frontend
   * @param userId - ID của user
   * @returns Promise<string[]>
   */
  async getMenuPermissions(userId: number): Promise<string[]> {
    const permissions = await this.permissionService.getUserPermissions(userId);
    
    // Chỉ trả về permissions liên quan đến menu/navigation
    const menuPermissions = permissions.filter(permission => {
      const [category] = permission.split('.');
      return ['user', 'project', 'timesheet', 'attendance', 'report', 'organization'].includes(category);
    });

    return menuPermissions;
  }
}
