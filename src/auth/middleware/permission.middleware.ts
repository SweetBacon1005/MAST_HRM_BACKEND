import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permission.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    [key: string]: any;
  };
}

@Injectable()
export class PermissionMiddleware implements NestMiddleware {
  protected readonly logger = new Logger(PermissionMiddleware.name);

  constructor(protected readonly permissionService: PermissionService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Chỉ áp dụng cho các route cần authentication
    if (!req.user) {
      return next();
    }

    // Log thông tin request để debug
    this.logger.debug(
      `User ${req.user.id} accessing ${req.method} ${req.path}`,
    );

    // Lấy permissions của user để cache trong request
    try {
      const userPermissions = await this.permissionService.getUserPermissions(
        req.user.id,
      );
      const userRole = await this.permissionService.getUserRoles(req.user.id);

      (req as any).userPermissions = userPermissions;
      (req as any).userRole = userRole;

    } catch (error) {
      this.logger.error(
        `Error getting permissions for user ${req.user.id}:`,
        error,
      );
    }

    next();
  }
}

/**
 * Middleware để kiểm tra permissions cụ thể
 */
@Injectable()
export class SpecificPermissionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SpecificPermissionMiddleware.name);

  constructor(
    private readonly permissionService: PermissionService,
    private readonly requiredPermissions: string[] = [],
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Chỉ áp dụng cho các route cần authentication
    if (!req.user) {
      return next();
    }

    // Log thông tin request để debug
    this.logger.debug(
      `User ${req.user.id} accessing ${req.method} ${req.path}`,
    );

    try {
      // Kiểm tra permissions cụ thể nếu có
      if (this.requiredPermissions.length > 0) {
        const hasRequiredPermission =
          await this.permissionService.hasAnyPermission(
            req.user.id,
            this.requiredPermissions,
          );

        if (!hasRequiredPermission) {
          this.logger.warn(
            `User ${req.user.id} denied access to ${req.method} ${req.path}. Required: ${this.requiredPermissions.join(', ')}`,
          );
          throw new ForbiddenException(
            `Bạn cần có ít nhất một trong các quyền: ${this.requiredPermissions.join(', ')}`,
          );
        }

        this.logger.debug(
          `User ${req.user.id} granted access to ${req.method} ${req.path}`,
        );
      }

      const userPermissions = await this.permissionService.getUserPermissions(
        req.user.id,
      );
      const userRole = await this.permissionService.getUserRoles(req.user.id);

      (req as any).userPermissions = userPermissions;
      (req as any).userRole = userRole;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Error checking permissions for user ${req.user.id}:`,
        error,
      );
    }

    next();
  }
}
