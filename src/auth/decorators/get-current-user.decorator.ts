
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator để lấy thông tin user từ request
 * 
 * Usage:
 * - @GetCurrentUser('id') → number
 * - @GetCurrentUser('email') → string
 * - @GetCurrentUser('roles') → string[] (DEPRECATED: Dùng @GetAuthContext() thay thế)
 * - @GetCurrentUser() → full user object
 * 
 * ⚠️ LƯU Ý: 
 * - @GetCurrentUser('roles') KHÔNG chính xác vì không check scope
 * - Nên dùng @GetAuthContext() để check role kèm scope:
 *   ```typescript
 *   @GetAuthContext() authContext: AuthorizationContext
 *   if (authContext.hasRole(ROLE_NAMES.ADMIN, ScopeType.COMPANY)) { ... }
 *   ```
 */
export const GetCurrentUser = createParamDecorator(
  async (data: string | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    let user = request.user;
    
    if (!user) {
      return undefined;
    }

    if (!data) {
      return user;
    }

    // Nếu request 'roles' và chưa có roleContexts → lazy load
    if (data === 'roles' && !user.roleContexts) {
      // Lazy load roles nếu chưa có
      // Note: Cần import RoleContextCacheService từ module
      // Tạm thời return empty array, sẽ load khi thực sự cần
      // Hoặc có thể throw error để developer biết cần @RequireRoles()
      return [];
    }

    const value = user?.[data];

    if (data === 'id' && typeof value === 'string') {
      const parsed = Number(value);
      return isNaN(parsed) ? value : parsed;
    }

    // Nếu request 'roles' và đã có roleContexts
    if (data === 'roles' && user.roleContexts) {
      return user.roleContexts.map((rc: any) => rc.roleName);
    }

    return value;
  },
);
