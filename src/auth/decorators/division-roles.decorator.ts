import { SetMetadata } from '@nestjs/common';

export const DIVISION_ROLES_KEY = 'division_roles';

/**
 * Decorator để kiểm tra role trong phòng ban
 * @param roles - Danh sách role được phép trong phòng ban
 * @example @DivisionRoles('MANAGER', 'TEAM_LEADER')
 */
export const DivisionRoles = (...roles: string[]) =>
  SetMetadata(DIVISION_ROLES_KEY, roles);

/**
 * Decorator để kiểm tra quyền trên phòng ban cụ thể
 * @param division_id - ID phòng ban cần kiểm tra
 * @param roles - Danh sách role được phép
 * @example @DivisionAccess(1, 'MANAGER', 'TEAM_LEADER')
 */
export const DIVISION_ACCESS_KEY = 'division_access';
export const DivisionAccess = (division_id: number, ...roles: string[]) =>
  SetMetadata(DIVISION_ACCESS_KEY, { division_id, roles });

/**
 * Decorator để kiểm tra quyền team leader
 * @example @RequireTeamLeader()
 */
export const TEAM_LEADER_KEY = 'team_leader';
export const RequireTeamLeader = () => SetMetadata(TEAM_LEADER_KEY, true);
