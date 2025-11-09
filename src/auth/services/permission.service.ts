import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RoleHierarchyService } from './role-hierarchy.service';
import { RoleAssignmentService } from './role-assignment.service';
import { ScopeType } from '@prisma/client';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RoleHierarchyService))
    private readonly roleHierarchyService: RoleHierarchyService,
    private readonly roleAssignmentService: RoleAssignmentService,
  ) {}

  /**
   * Kiểm tra user có permission cụ thể không (với role hierarchy)
   * @param userId - ID của user
   * @param permission - Tên permission cần kiểm tra
   * @returns Promise<boolean>
   */
  async hasPermission(userId: number, permission: string, scopeType?: string, scopeId?: number): Promise<boolean> {
    try {
      // Lấy role assignments của user
      const userRoles = await this.roleAssignmentService.getUserRoles(userId);
      
      if (!userRoles || userRoles.roles.length === 0) {
        this.logger.debug(`User ${userId} has no role assignments`);
        return false;
      }

      // Lấy tất cả permissions từ các roles của user
      const roleIds = userRoles.roles.map(role => role.id);
      
      const permissions = await this.prisma.permission_role.findMany({
        where: {
          role_id: { in: roleIds },
          role: { deleted_at: null },
          permission: { deleted_at: null }
        },
        include: {
          permission: true,
          role: true
        }
      });

      // Kiểm tra permission trực tiếp
      const hasDirectPermission = permissions.some(pr => 
        pr.permission.name === permission
      );

      if (hasDirectPermission) {
        this.logger.debug(`User ${userId} has direct permission: ${permission}`);
        return true;
      }

      // Kiểm tra quyền kế thừa từ các role thấp hơn (role hierarchy)
      const userRoleNames = userRoles.roles.map(role => role.name);
      
      for (const roleName of userRoleNames) {
        const hasInheritedPermission = await this.hasInheritedPermission(
          roleName,
          permission,
          userId,
        );

        if (hasInheritedPermission) {
          this.logger.debug(
            `User ${userId} has inherited permission: ${permission} from role: ${roleName}`,
          );
          return true;
        }
      }

      this.logger.debug(
        `User ${userId} does not have permission: ${permission}`,
      );
      return false;
    } catch (error) {
      this.logger.error(`Error checking permission for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Kiểm tra quyền kế thừa từ các role thấp hơn
   * @param userRoleName - Tên role của user
   * @param permission - Permission cần kiểm tra
   * @param userId - ID của user (để log)
   * @returns Promise<boolean>
   */
  private async hasInheritedPermission(
    userRoleName: string,
    permission: string,
    userId?: number,
  ): Promise<boolean> {
    try {
      // Lấy danh sách các role mà user role này có thể quản lý
      const manageableRoles =
        this.roleHierarchyService.getManageableRoles(userRoleName);

      if (manageableRoles.length === 0) {
        return false;
      }

      // Lấy tất cả permissions của các role thấp hơn
      const lowerRolesPermissions = await this.prisma.roles.findMany({
        where: {
          name: { in: manageableRoles },
          deleted_at: null,
        },
        include: {
          permission_role: {
            include: {
              permission: true,
            },
          },
        },
      });

      // Kiểm tra xem permission có trong các role thấp hơn không
      for (const role of lowerRolesPermissions) {
        const rolePermissions = role.permission_role.map(
          (pr) => pr.permission.name,
        );
        if (rolePermissions.includes(permission)) {
          this.logger.debug(
            `Permission ${permission} found in lower role: ${role.name}${userId ? ` (User ${userId})` : ''}`,
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking inherited permission:', error);
      return false;
    }
  }

  /**
   * Kiểm tra user có ít nhất 1 trong các permissions (OR logic)
   * @param userId - ID của user
   * @param permissions - Array các permissions
   * @returns Promise<boolean>
   */
  async hasAnyPermission(
    userId: number,
    permissions: string[],
  ): Promise<boolean> {
    try {
      for (const permission of permissions) {
        if (await this.hasPermission(userId, permission)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      this.logger.error(
        `Error checking any permissions for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Kiểm tra user có tất cả permissions (AND logic)
   * @param userId - ID của user
   * @param permissions - Array các permissions
   * @returns Promise<boolean>
   */
  async hasAllPermissions(
    userId: number,
    permissions: string[],
  ): Promise<boolean> {
    try {
      for (const permission of permissions) {
        if (!(await this.hasPermission(userId, permission))) {
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Error checking all permissions for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Lấy tất cả permissions của user
   * @param userId - ID của user
   * @returns Promise<string[]>
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    try {
      // Lấy role assignments của user
      const userRoles = await this.roleAssignmentService.getUserRoles(userId);
      
      if (!userRoles || userRoles.roles.length === 0) {
        return [];
      }

      // Lấy tất cả permissions từ các roles của user
      const roleIds = userRoles.roles.map(role => role.id);
      
      const permissions = await this.prisma.permission_role.findMany({
        where: {
          role_id: { in: roleIds },
          role: { deleted_at: null },
          permission: { deleted_at: null }
        },
        include: {
          permission: true
        }
      });

      const permissionNames = [...new Set(permissions.map(pr => pr.permission.name))];
      
      return permissionNames;
    } catch (error) {
      this.logger.error(`Error getting permissions for user ${userId}:`, error);
      return [];
    }
  }

  async getUserRole(
    userId: number,
  ): Promise<{ id: number; name: string } | null> {
    try {
      const primaryRole = await this.roleAssignmentService.getUserPrimaryRole(userId, ScopeType.COMPANY);
      
      if (!primaryRole) {
        const userRoles = await this.roleAssignmentService.getUserRoles(userId);
        if (userRoles.roles.length > 0) {
          const firstRole = userRoles.roles[0];
          return {
            id: firstRole.id,
            name: firstRole.name,
          };
        }
        return null;
      }

      return {
        id: primaryRole.id,
        name: primaryRole.name,
      };
    } catch (error) {
      this.logger.error(`Error getting role for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Kiểm tra user có phải là admin không
   * @param userId - ID của user
   * @returns Promise<boolean>
   */
  async isAdmin(userId: number): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role?.name === 'admin' || role?.name === 'super_admin';
  }

  /**
   * Kiểm tra user có phải là super admin không
   * @param userId - ID của user
   * @returns Promise<boolean>
   */
  async isSuperAdmin(userId: number): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role?.name === 'super_admin';
  }
}
