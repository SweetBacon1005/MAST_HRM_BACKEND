import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthorizationContextService } from '../services/authorization-context.service';

/**
 * Decorator để lấy Authorization Context trong controller
 * 
 * Usage:
 * ```typescript
 * @Post('approve')
 * async approveRequest(
 *   @GetAuthContext() authContext: AuthorizationContext,
 *   @Param('id') id: number,
 * ) {
 *   // Check permissions
 *   if (!authContext.hasRole('admin', ScopeType.COMPANY)) {
 *     throw new ForbiddenException();
 *   }
 * 
 *   // Or use built-in methods
 *   const canApprove = await authContext.canApproveRequest(requestOwnerId, 'day-off');
 * }
 * ```
 * 
 * IMPORTANT: RoleContextLoaderGuard phải được apply trước decorator này
 * để đảm bảo roleContexts đã được load vào request.user
 */
export const GetAuthContext = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new Error(
        'User not found in request. Ensure JwtAuthGuard is applied before GetAuthContext.',
      );
    }

    // Get AuthorizationContextService from the app context
    // Note: Service phải được inject vào module để có thể access
    const authContextService = new AuthorizationContextService(
      request.prismaService || request.app.get('PrismaService'),
    );

    return await authContextService.createContext(user);
  },
);
