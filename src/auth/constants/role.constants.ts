import { ProjectStatus } from '@prisma/client';

export const ROLE_NAMES = {
  EMPLOYEE: 'employee',
  TEAM_LEADER: 'team_leader',
  DIVISION_HEAD: 'division_head',
  PROJECT_MANAGER: 'project_manager',
  HR_MANAGER: 'hr_manager',
  COMPANY_OWNER: 'company_owner',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export const PROJECT_POSITIONS = {
  MONITOR: 1, // PM chính - chỉ được là PM chính của 1 dự án tại 1 thời điểm
  SUPPORTER: 2, // PM hỗ trợ - có thể hỗ trợ nhiều dự án
  IMPLEMENTOR: 3, // Thành viên thực hiện
} as const;

export const PROJECT_STATUS = {
  OPEN: 'OPEN' as ProjectStatus,
  IN_PROGRESS: 'IN_PROGRESS' as ProjectStatus,
  PENDING: 'PENDING' as ProjectStatus,
  CANCELED: 'CANCELED' as ProjectStatus,
  GUARANTEE: 'GUARANTEE' as ProjectStatus,
  CLOSED: 'CLOSED' as ProjectStatus,
} as const;

export const ACTIVITY_LOG_EVENTS = {
  ASSIGN_ROLE: 'assign_role',
  REVOKE_ROLE: 'revoke_role',
  BULK_ASSIGN_ROLE: 'role.bulk_assigned',
} as const;

export const CAUSER_TYPES = {
  USERS: 'users',
  DIVISION_MASTER: 'division_master',
} as const;

export const SUBJECT_TYPES = {
  USERS: 'users',
} as const;

// Roles mà division_head có thể gán
export const DIVISION_HEAD_ASSIGNABLE_ROLES = [
  ROLE_NAMES.TEAM_LEADER,
  ROLE_NAMES.PROJECT_MANAGER,
];

// Trạng thái dự án đang hoạt động
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  PROJECT_STATUS.OPEN,
  PROJECT_STATUS.IN_PROGRESS,
];
