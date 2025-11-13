import { ScopeType } from '@prisma/client';
import { getRoleLevel, ROLE_NAMES } from '../constants/role.constants';

export interface UserRoleInfo {
  id: number;
  email: string;
  role?: string | null;
  roles?: string[];
  highestRole?: string | null;
  roleLevel?: number;
  roleAssignments?: Array<{
    id: number;
    name: string;
    scope_type: ScopeType;
    scope_id?: number | null;
  }>;
}

/**
 * Kiểm tra user có role cụ thể không
 */
export const hasRole = (user: UserRoleInfo, roleName: string): boolean => {
  return user.roles?.includes(roleName) || false;
};

/**
 * Kiểm tra user có bất kỳ role nào trong danh sách không
 */
export const hasAnyRole = (user: UserRoleInfo, roleNames: string[]): boolean => {
  if (!user.roles || user.roles.length === 0) return false;
  return roleNames.some(role => user.roles!.includes(role));
};

/**
 * Kiểm tra user có tất cả roles trong danh sách không
 */
export const hasAllRoles = (user: UserRoleInfo, roleNames: string[]): boolean => {
  if (!user.roles || user.roles.length === 0) return false;
  return roleNames.every(role => user.roles!.includes(role));
};

/**
 * Kiểm tra user có role với level tối thiểu không
 */
export const hasMinimumRoleLevel = (user: UserRoleInfo, minimumLevel: number): boolean => {
  return (user.roleLevel || 0) >= minimumLevel;
};

/**
 * Kiểm tra user có role cao hơn role khác không
 */
export const hasHigherRoleThan = (user: UserRoleInfo, roleName: string): boolean => {
  const userLevel = user.roleLevel || 0;
  const compareLevel = getRoleLevel(roleName);
  return userLevel > compareLevel;
};

/**
 * Kiểm tra user có role trong scope cụ thể không
 */
export const hasRoleInScope = (
  user: UserRoleInfo, 
  roleName: string, 
  scopeType: ScopeType, 
  scopeId?: number
): boolean => {
  if (!user.roleAssignments) return false;
  
  return user.roleAssignments.some(assignment => 
    assignment.name === roleName && 
    assignment.scope_type === scopeType &&
    (scopeId === undefined || assignment.scope_id === scopeId)
  );
};

/**
 * Lấy tất cả roles trong scope cụ thể
 */
export const getRolesInScope = (
  user: UserRoleInfo, 
  scopeType: ScopeType, 
  scopeId?: number
): string[] => {
  if (!user.roleAssignments) return [];
  
  return user.roleAssignments
    .filter(assignment => 
      assignment.scope_type === scopeType &&
      (scopeId === undefined || assignment.scope_id === scopeId)
    )
    .map(assignment => assignment.name);
};

/**
 * Kiểm tra user có phải admin không (admin, super_admin, company_owner)
 */
export const isAdmin = (user: UserRoleInfo): boolean => {
  return hasAnyRole(user, [ROLE_NAMES.ADMIN]);
};

/**
 * Kiểm tra user có phải manager không (division_head, project_manager, team_leader)
 */
export const isManager = (user: UserRoleInfo): boolean => {
  return hasAnyRole(user, [
    ROLE_NAMES.DIVISION_HEAD,
    ROLE_NAMES.PROJECT_MANAGER,
    ROLE_NAMES.TEAM_LEADER
  ]);
};

/**
 * Kiểm tra user có phải HR không
 */
export const isHR = (user: UserRoleInfo): boolean => {
  return hasRole(user, ROLE_NAMES.HR_MANAGER);
};

/**
 * Lấy thông tin role hierarchy của user
 */
export const getUserRoleHierarchy = (user: UserRoleInfo) => {
  const roles = user.roles || [];
  const roleHierarchy = roles.map(role => ({
    name: role,
    level: getRoleLevel(role)
  })).sort((a, b) => b.level - a.level);

  return {
    highestRole: user.highestRole,
    highestLevel: user.roleLevel || 0,
    allRoles: roleHierarchy,
    canManage: roles.filter(role => getRoleLevel(role) < (user.roleLevel || 0))
  };
};

/**
 * Kiểm tra user có thể quản lý user khác không (dựa trên role level)
 */
export const canManageUser = (manager: UserRoleInfo, target: UserRoleInfo): boolean => {
  const managerLevel = manager.roleLevel || 0;
  const targetLevel = target.roleLevel || 0;
  
  // Manager phải có level cao hơn target
  return managerLevel > targetLevel;
};

/**
 * Decorator helper để extract user info từ request
 */
export const extractUserRoleInfo = (user: any): UserRoleInfo => {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles || [],
    highestRole: user.highestRole,
    roleLevel: user.roleLevel || 0,
    roleAssignments: user.roleAssignments || []
  };
};














