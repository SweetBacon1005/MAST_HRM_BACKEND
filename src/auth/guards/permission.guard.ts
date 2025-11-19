import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy permission requirements từ decorator
    const requiredPermission = this.reflector.getAllAndOverride<
      string | string[]
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const requiredAllPermissions = this.reflector.getAllAndOverride<string[]>(
      `${PERMISSION_KEY}_all`,
      [context.getHandler(), context.getClass()],
    );

    // Nếu không có permission requirement, cho phép truy cập
    if (!requiredPermission && !requiredAllPermissions) {
      return true;
    }

    // Lấy user từ request (đã được set bởi JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      this.logger.warn('No user found in request');
      throw new ForbiddenException('Không có quyền truy cập');
    }

    const user_id = user.id;

    try {
      // Kiểm tra RequireAllPermissions trước
      if (requiredAllPermissions && requiredAllPermissions.length > 0) {
        const hasAllPermissions =
          await this.permissionService.hasAllPermissions(
            user_id,
            requiredAllPermissions,
          );

        if (!hasAllPermissions) {
          this.logger.warn(
            `User ${user_id} does not have all required permissions: ${requiredAllPermissions.join(', ')}`,
          );
          throw new ForbiddenException(
            `Bạn cần có tất cả các quyền: ${requiredAllPermissions.join(', ')}`,
          );
        }

        this.logger.debug(
          `User ${user_id} has all required permissions: ${requiredAllPermissions.join(', ')}`,
        );
        return true;
      }

      // Kiểm tra RequirePermission hoặc RequireAnyPermission
      if (requiredPermission) {
        let hasPermission = false;

        if (typeof requiredPermission === 'string') {
          // Single permission
          hasPermission = await this.permissionService.hasPermission(
            user_id,
            requiredPermission,
          );

          if (!hasPermission) {
            this.logger.warn(
              `User ${user_id} does not have required permission: ${requiredPermission}`,
            );
            throw new ForbiddenException(
              `Bạn cần có quyền: ${requiredPermission}`,
            );
          }
        } else if (Array.isArray(requiredPermission)) {
          // Multiple permissions (OR logic)
          hasPermission = await this.permissionService.hasAnyPermission(
            user_id,
            requiredPermission,
          );

          if (!hasPermission) {
            this.logger.warn(
              `User ${user_id} does not have any of required permissions: ${requiredPermission.join(', ')}`,
            );
            throw new ForbiddenException(
              `Bạn cần có ít nhất một trong các quyền: ${requiredPermission.join(', ')}`,
            );
          }
        }

        this.logger.debug(
          `User ${user_id} has required permission(s): ${
            typeof requiredPermission === 'string'
              ? requiredPermission
              : requiredPermission.join(', ')
          }`,
        );
        return true;
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Error checking permissions for user ${user_id}:`,
        error,
      );
      throw new ForbiddenException('Lỗi kiểm tra quyền truy cập');
    }
  }
}
