import { SetMetadata } from '@nestjs/common';

/**
 * Decorator để đánh dấu route cần load role contexts
 * 
 * Usage:
 * ```typescript
 * @Get('my-data')
 * @RequireRoles()
 * async getMyData(@GetCurrentUser('id') user_id: number) {
 *   // Role contexts sẽ được load bởi RoleContextLoaderGuard
 * }
 * ```
 * 
 * Decorator này giúp RoleContextLoaderGuard biết route này cần roles
 * để load sớm thay vì lazy load sau
 */
export const RequireRoles = () => SetMetadata('requiresRoles', true);

