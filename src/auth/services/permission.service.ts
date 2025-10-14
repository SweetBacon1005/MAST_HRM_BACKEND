import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra user có permission cụ thể không
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
          deleted_at: null 
        },
        include: {
          user_information: {
            include: {
              role: {
                include: {
                  permission_role: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!user || !user.user_information || user.user_information.length === 0 || !user.user_information[0].role) {
        this.logger.warn(`User ${userId} not found or has no role assigned`);
        return false;
      }

      // Lấy danh sách permissions của user (lấy user_information đầu tiên)
      const userPermissions = user.user_information[0].role.permission_role
        .map(pr => pr.permission.name);

      // Kiểm tra permission
      const hasPermission = userPermissions.includes(permission);
      
      this.logger.debug(`User ${userId} ${hasPermission ? 'has' : 'does not have'} permission: ${permission}`);
      
      return hasPermission;
    } catch (error) {
      this.logger.error(`Error checking permission for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Kiểm tra user có ít nhất 1 trong các permissions (OR logic)
   * @param userId - ID của user
   * @param permissions - Array các permissions
   * @returns Promise<boolean>
   */
  async hasAnyPermission(userId: number, permissions: string[]): Promise<boolean> {
    try {
      for (const permission of permissions) {
        if (await this.hasPermission(userId, permission)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      this.logger.error(`Error checking any permissions for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Kiểm tra user có tất cả permissions (AND logic)
   * @param userId - ID của user
   * @param permissions - Array các permissions
   * @returns Promise<boolean>
   */
  async hasAllPermissions(userId: number, permissions: string[]): Promise<boolean> {
    try {
      for (const permission of permissions) {
        if (!(await this.hasPermission(userId, permission))) {
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.error(`Error checking all permissions for user ${userId}:`, error);
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
          deleted_at: null 
        },
        include: {
          user_information: {
            include: {
              role: {
                include: {
                  permission_role: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!user || !user.user_information || user.user_information.length === 0 || !user.user_information[0].role) {
        return [];
      }

      return user.user_information[0].role.permission_role
        .map(pr => pr.permission.name);
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
  async getUserRole(userId: number): Promise<{id: number, name: string} | null> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { 
          id: userId,
          deleted_at: null 
        },
        include: {
          user_information: {
            include: {
              role: true
            }
          }
        }
      });

      if (!user || !user.user_information || user.user_information.length === 0 || !user.user_information[0].role) {
        return null;
      }

      return {
        id: user.user_information[0].role.id,
        name: user.user_information[0].role.name
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
