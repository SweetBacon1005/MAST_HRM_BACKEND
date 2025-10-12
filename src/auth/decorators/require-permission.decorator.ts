import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/**
 * Decorator để yêu cầu permission cụ thể cho endpoint
 * @param permission - Tên permission cần thiết (ví dụ: 'user.create', 'project.read')
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

/**
 * Decorator để yêu cầu nhiều permissions (OR logic)
 * User chỉ cần có ít nhất 1 trong các permissions
 * @param permissions - Array các permissions
 */
export const RequireAnyPermission = (permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);

/**
 * Decorator để yêu cầu tất cả permissions (AND logic)
 * User phải có tất cả các permissions
 * @param permissions - Array các permissions
 */
export const RequireAllPermissions = (permissions: string[]) =>
  SetMetadata(`${PERMISSION_KEY}_all`, permissions);
