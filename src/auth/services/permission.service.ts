import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RoleHierarchyService } from './role-hierarchy.service';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RoleHierarchyService))
    private readonly roleHierarchyService: RoleHierarchyService,
  ) {}

  /**
   * Kiểm tra user có permission cụ thể không (với role hierarchy)
   * @param userId - ID của user
   * @param permission - Tên permission cần kiểm tra
   * @returns Promise<boolean>
   */
  async hasPermission(userId: number, permission: string): Promise<boolean> {
    try {
      // Lấy thông tin user với role và permissions
      const user = await this.prisma.users.findUnique({
        where: {
          id: userId,
          deleted_at: null,
        },
        include: {
          user_information: {
            include: {
              role: {
                include: {
                  permission_role: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (
        !user ||
        !user.user_information ||
        user.user_information.length === 0 ||
        !user.user_information[0].role
      ) {
        this.logger.warn(`User ${userId} not found or has no role assigned`);
        return false;
      }

      const userRole = user.user_information[0].role;

      // Lấy danh sách permissions trực tiếp của user
      const directPermissions = userRole.permission_role.map(
        (pr) => pr.permission.name,
      );

      // Kiểm tra permission trực tiếp
      if (directPermissions.includes(permission)) {
        this.logger.debug(
          `User ${userId} has direct permission: ${permission}`,
        );
        return true;
      }

      // Kiểm tra quyền kế thừa từ các role thấp hơn (role hierarchy)
      const hasInheritedPermission = await this.hasInheritedPermission(
        userRole.name,
        permission,
        userId,
      );

      if (hasInheritedPermission) {
        this.logger.debug(
          `User ${userId} has inherited permission: ${permission} from lower roles`,
        );
        return true;
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
      const user = await this.prisma.users.findUnique({
        where: {
          id: userId,
          deleted_at: null,
        },
        include: {
          user_information: {
            include: {
              role: {
                include: {
                  permission_role: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (
        !user ||
        !user.user_information ||
        user.user_information.length === 0 ||
        !user.user_information[0].role
      ) {
        return [];
      }

      return user.user_information[0].role.permission_role.map(
        (pr) => pr.permission.name,
      );
    } catch (error) {
      this.logger.error(`Error getting permissions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Lấy thông tin role của user
   * @param userId - ID của user
   * @returns Promise<{id: number, name: string} | null>
   */
  async getUserRole(
    userId: number,
  ): Promise<{ id: number; name: string } | null> {
    try {
      const user = await this.prisma.users.findUnique({
        where: {
          id: userId,
          deleted_at: null,
        },
        include: {
          user_information: {
            include: {
              role: true,
            },
          },
        },
      });

      if (
        !user ||
        !user.user_information ||
        user.user_information.length === 0 ||
        !user.user_information[0].role
      ) {
        return null;
      }

      return {
        id: user.user_information[0].role.id,
        name: user.user_information[0].role.name,
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
