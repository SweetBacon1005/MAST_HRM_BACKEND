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

    const userId = user.id;

    try {
      // Kiểm tra RequireAllPermissions trước
      if (requiredAllPermissions && requiredAllPermissions.length > 0) {
        const hasAllPermissions =
          await this.permissionService.hasAllPermissions(
            userId,
            requiredAllPermissions,
          );

        if (!hasAllPermissions) {
          this.logger.warn(
            `User ${userId} does not have all required permissions: ${requiredAllPermissions.join(', ')}`,
          );
          throw new ForbiddenException(
            `Bạn cần có tất cả các quyền: ${requiredAllPermissions.join(', ')}`,
          );
        }

        this.logger.debug(
          `User ${userId} has all required permissions: ${requiredAllPermissions.join(', ')}`,
        );
        return true;
      }

      // Kiểm tra RequirePermission hoặc RequireAnyPermission
      if (requiredPermission) {
        let hasPermission = false;

        if (typeof requiredPermission === 'string') {
          // Single permission
          hasPermission = await this.permissionService.hasPermission(
            userId,
            requiredPermission,
          );

          if (!hasPermission) {
            this.logger.warn(
              `User ${userId} does not have required permission: ${requiredPermission}`,
            );
            throw new ForbiddenException(
              `Bạn cần có quyền: ${requiredPermission}`,
            );
          }
        } else if (Array.isArray(requiredPermission)) {
          // Multiple permissions (OR logic)
          hasPermission = await this.permissionService.hasAnyPermission(
            userId,
            requiredPermission,
          );

          if (!hasPermission) {
            this.logger.warn(
              `User ${userId} does not have any of required permissions: ${requiredPermission.join(', ')}`,
            );
            throw new ForbiddenException(
              `Bạn cần có ít nhất một trong các quyền: ${requiredPermission.join(', ')}`,
            );
          }
        }

        this.logger.debug(
          `User ${userId} has required permission(s): ${
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
        `Error checking permissions for user ${userId}:`,
        error,
      );
      throw new ForbiddenException('Lỗi kiểm tra quyền truy cập');
    }
  }
}
