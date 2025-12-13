import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RoleContextLoaderGuard } from './role-context-loader.guard';

/**
 * GlobalAuthGuard - Chain JWT validation + Role Context Loading
 * 
 * Flow:
 * 1. Check if route is public → skip authentication
 * 2. JWT validation (via PassportStrategy)
 * 3. Load role contexts từ cache/DB (via RoleContextLoaderGuard)
 * 4. Request continues with full user + roleContexts
 * 
 * Note: Chỉ apply cho routes không có @Public() decorator
 */
@Injectable()
export class GlobalAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private roleContextLoaderGuard: RoleContextLoaderGuard,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Step 1: JWT validation
    const jwtValid = await super.canActivate(context);
    if (!jwtValid) {
      return false;
    }

    // Step 2: Load role contexts
    // RoleContextLoaderGuard sẽ enhance request.user với roleContexts
    const roleContextsLoaded =
      await this.roleContextLoaderGuard.canActivate(context);

    return roleContextsLoaded;
  }
}
