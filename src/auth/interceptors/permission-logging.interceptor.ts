import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PermissionLoggingInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Lấy permission requirements từ decorator
    const requiredPermission = this.reflector.getAllAndOverride<
      string | string[]
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const requiredAllPermissions = this.reflector.getAllAndOverride<string[]>(
      `${PERMISSION_KEY}_all`,
      [context.getHandler(), context.getClass()],
    );

    // Log thông tin truy cập
    const method = request.method;
    const url = request.url;
    const userInfo = user ? `User ${user.id} (${user.email})` : 'Anonymous';

    let permissionInfo = 'No permission required';
    if (requiredAllPermissions && requiredAllPermissions.length > 0) {
      permissionInfo = `Requires ALL: [${requiredAllPermissions.join(', ')}]`;
    } else if (requiredPermission) {
      if (typeof requiredPermission === 'string') {
        permissionInfo = `Requires: ${requiredPermission}`;
      } else if (Array.isArray(requiredPermission)) {
        permissionInfo = `Requires ANY: [${requiredPermission.join(', ')}]`;
      }
    }

    this.logger.log(
      `${userInfo} accessing ${method} ${url} - ${permissionInfo}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap({
        next: (_response) => {
          const duration = Date.now() - now;
          this.logger.log(
            `${userInfo} successfully accessed ${method} ${url} in ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `${userInfo} failed to access ${method} ${url} after ${duration}ms: ${error.message}`,
          );
        },
      }),
    );
  }
}
