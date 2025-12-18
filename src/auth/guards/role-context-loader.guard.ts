import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleContextCacheService } from '../services/role-context-cache.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

/**
 * Guard này load role contexts vào request object
 * Phải đặt SAU JwtAuthGuard trong guards chain
 * 
 * Flow:
 * 1. JwtAuthGuard validates token và set request.user = { id, email, jti }
 * 2. RoleContextLoaderGuard loads roleContexts từ cache/DB (CHỈ KHI CẦN)
 * 3. Updates request.user với roleContexts và highestRoles
 * 4. Controller/Service có thể access full authorization context
 * 
 * TỐI ƯU: Chỉ load roles khi:
 * - Route có @RequirePermission decorator
 * - Route có @RequireRoles decorator (nếu có)
 * - Route được đánh dấu cần roles (via metadata)
 * 
 * Điều này giảm tải DB/cache cho các request không cần roles
 */
@Injectable()
export class RoleContextLoaderGuard implements CanActivate {
  private readonly logger = new Logger(RoleContextLoaderGuard.name);

  constructor(
    private roleContextCacheService: RoleContextCacheService,
    private reflector: Reflector,
  ) {}

  /**
   * Kiểm tra xem route có cần load roles không
   */
  private needsRoleContexts(context: ExecutionContext): boolean {
    // Check if route requires permissions (sẽ cần roles để check)
    const requiredPermission = this.reflector.getAllAndOverride<
      string | string[]
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const requiredAllPermissions = this.reflector.getAllAndOverride<string[]>(
      `${PERMISSION_KEY}_all`,
      [context.getHandler(), context.getClass()],
    );

    // Check if route requires roles (custom decorator)
    const requiresRoles = this.reflector.getAllAndOverride<boolean>(
      'requiresRoles',
      [context.getHandler(), context.getClass()],
    );

    // Nếu có permission requirement hoặc role requirement → cần load roles
    return !!(requiredPermission || requiredAllPermissions || requiresRoles);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      // Nếu không có user, để JwtAuthGuard xử lý
      // This guard chỉ enhance user object nếu đã có
      return true;
    }

    // TỐI ƯU: Chỉ load roles khi thực sự cần
    if (!this.needsRoleContexts(context)) {
      // Không cần roles, skip loading để giảm tải
      this.logger.debug(
        `Skipping role context load for user ${user.id} - not required for this route`,
      );
      return true;
    }

    try {
      // Load role contexts từ cache/DB
      const roleContexts =
        await this.roleContextCacheService.getUserRoleContexts(user.id);

      // Attach vào request để controllers/services dùng
      request.user = {
        ...user,
        roleContexts: roleContexts.roleContexts,
        highestRoles: roleContexts.highestRoles,
        email: roleContexts.email, // Ensure email is always available
      };

      this.logger.debug(
        `Loaded ${roleContexts.roleContexts.length} role contexts for user ${user.id}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to load role contexts for user ${user.id}:`,
        error,
      );

      // Don't block request on cache/DB error
      // But log it for monitoring
      // The request will proceed without role contexts
      // Authorization guards will handle the missing context appropriately
      
      request.user = {
        ...user,
        roleContexts: [],
        highestRoles: {
          COMPANY: null,
          DIVISION: {},
          TEAM: {},
          PROJECT: {},
        },
      };

      return true;
    }
  }
}
