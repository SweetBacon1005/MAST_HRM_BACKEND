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

  async hasPermission(user_id: number, permission: string, scopeType?: string, scopeId?: number): Promise<boolean> {
    try {
      const userRoles = await this.roleAssignmentService.getUserRoles(user_id);
      
      if (!userRoles || userRoles.roles.length === 0) {
        this.logger.debug(`User ${user_id} has no role assignments`);
        return false;
      }

      const role_ids = userRoles.roles.map(role => role.id);
      
      const permissions = await this.prisma.permission_role.findMany({
        where: {
          role_id: { in: role_ids },
          role: { deleted_at: null },
          permission: { deleted_at: null }
        },
        include: {
          permission: true,
          role: true
        }
      });

      const hasDirectPermission = permissions.some(pr => 
        pr.permission.name === permission
      );

      if (hasDirectPermission) {
        this.logger.debug(`User ${user_id} has direct permission: ${permission}`);
        return true;
      }

      const userRoleNames = userRoles.roles.map(role => role.name);

      this.logger.debug(
        `User ${user_id} does not have permission: ${permission}`,
      );
      return false;
    } catch (error) {
      this.logger.error(`Error checking permission for user ${user_id}:`, error);
      return false;
    }
  }

  async hasAnyPermission(
    user_id: number,
    permissions: string[],
  ): Promise<boolean> {
    try {
      for (const permission of permissions) {
        if (await this.hasPermission(user_id, permission)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      this.logger.error(
        `Error checking any permissions for user ${user_id}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Kiểm tra user có tất cả permissions (AND logic)
   * @param user_id - ID của user
   * @param permissions - Array các permissions
   * @returns Promise<boolean>
   */
  async hasAllPermissions(
    user_id: number,
    permissions: string[],
  ): Promise<boolean> {
    try {
      for (const permission of permissions) {
        if (!(await this.hasPermission(user_id, permission))) {
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Error checking all permissions for user ${user_id}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Lấy tất cả permissions của user
   * @param user_id - ID của user
   * @returns Promise<string[]>
   */
  async getUserPermissions(user_id: number): Promise<string[]> {
    try {
      // Lấy role assignments của user
      const userRoles = await this.roleAssignmentService.getUserRoles(user_id);
      
      if (!userRoles || userRoles.roles.length === 0) {
        return [];
      }

      // Lấy tất cả permissions từ các roles của user
      const role_ids = userRoles.roles.map(role => role.id);
      
      const permissions = await this.prisma.permission_role.findMany({
        where: {
          role_id: { in: role_ids },
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
      this.logger.error(`Error getting permissions for user ${user_id}:`, error);
      return [];
    }
  }

  async getUserRoles(
    user_id: number,
  ): Promise<{ id: number; name: string }[]> {
    try {
        const userRoles = await this.roleAssignmentService.getUserRoles(user_id);
        return userRoles.roles;
    } catch (error) {
      this.logger.error(`Error getting roles for user ${user_id}:`, error);
      return [];
    }
  }
}
