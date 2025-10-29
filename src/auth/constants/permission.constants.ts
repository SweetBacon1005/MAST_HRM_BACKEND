/**
 * Permission constants cho toàn bộ hệ thống
 */

// === ASSET PERMISSIONS ===
export const ASSET_PERMISSIONS = {
  // CRUD permissions
  CREATE: 'asset.create',
  READ: 'asset.read',
  UPDATE: 'asset.update',
  DELETE: 'asset.delete',
  
  // Assignment permissions
  ASSIGN: 'asset.assign',
  UNASSIGN: 'asset.unassign',
  
  // Request permissions
  REQUEST_CREATE: 'asset.request.create',
  REQUEST_READ: 'asset.request.read',
  REQUEST_APPROVE: 'asset.request.approve',
  REQUEST_REJECT: 'asset.request.reject',
  
  // Statistics permissions
  STATISTICS: 'asset.statistics',
} as const;

// === USER PERMISSIONS ===
export const USER_PERMISSIONS = {
  CREATE: 'user.create',
  READ: 'user.read',
  UPDATE: 'user.update',
  DELETE: 'user.delete',
  PROFILE_READ: 'user.profile.read',
  PROFILE_UPDATE: 'user.profile.update',
} as const;

// === ATTENDANCE PERMISSIONS ===
export const ATTENDANCE_PERMISSIONS = {
  READ: 'attendance.read',
  CALCULATE: 'attendance.calculate',
  WORK_SHIFT_CREATE: 'attendance.work_shift.create',
  WORK_SHIFT_UPDATE: 'attendance.work_shift.update',
  WORK_SHIFT_DELETE: 'attendance.work_shift.delete',
  DASHBOARD: 'attendance.dashboard',
  REPORT: 'attendance.report',
  EXPORT: 'attendance.export',
} as const;

// === TIMESHEET PERMISSIONS ===
export const TIMESHEET_PERMISSIONS = {
  CREATE: 'timesheet.create',
  READ: 'timesheet.read',
  UPDATE: 'timesheet.update',
  DELETE: 'timesheet.delete',
  CHECKIN: 'timesheet.checkin',
  CHECKOUT: 'timesheet.checkout',
  REPORT: 'timesheet.report',
} as const;

// === REQUEST PERMISSIONS ===
export const REQUEST_PERMISSIONS = {
  CREATE: 'request.create',
  READ: 'request.read',
  UPDATE: 'request.update',
  DELETE: 'request.delete',
  APPROVE: 'request.approve',
  REJECT: 'request.reject',
  READ_ALL: 'request.read.all',
  READ_DIVISION: 'request.read.division',
} as const;

// === DIVISION PERMISSIONS ===
export const DIVISION_PERMISSIONS = {
  CREATE: 'division.create',
  READ: 'division.read',
  UPDATE: 'division.update',
  DELETE: 'division.delete',
  MEMBER_MANAGE: 'division.member.manage',
  STATISTICS: 'division.statistics',
} as const;

// === PROJECT PERMISSIONS ===
export const PROJECT_PERMISSIONS = {
  CREATE: 'project.create',
  READ: 'project.read',
  UPDATE: 'project.update',
  DELETE: 'project.delete',
  MEMBER_MANAGE: 'project.member.manage',
} as const;

// === ROLE PERMISSIONS ===
export const ROLE_PERMISSIONS = {
  ASSIGN: 'role.assign',
  REVOKE: 'role.revoke',
  READ: 'role.read',
} as const;

// === ALL PERMISSIONS ===
export const ALL_PERMISSIONS = {
  ...ASSET_PERMISSIONS,
  ...USER_PERMISSIONS,
  ...ATTENDANCE_PERMISSIONS,
  ...TIMESHEET_PERMISSIONS,
  ...REQUEST_PERMISSIONS,
  ...DIVISION_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
  ...ROLE_PERMISSIONS,
} as const;

// Type definitions
export type AssetPermission = typeof ASSET_PERMISSIONS[keyof typeof ASSET_PERMISSIONS];
export type UserPermission = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS];
export type AttendancePermission = typeof ATTENDANCE_PERMISSIONS[keyof typeof ATTENDANCE_PERMISSIONS];
export type TimesheetPermission = typeof TIMESHEET_PERMISSIONS[keyof typeof TIMESHEET_PERMISSIONS];
export type RequestPermission = typeof REQUEST_PERMISSIONS[keyof typeof REQUEST_PERMISSIONS];
export type DivisionPermission = typeof DIVISION_PERMISSIONS[keyof typeof DIVISION_PERMISSIONS];
export type ProjectPermission = typeof PROJECT_PERMISSIONS[keyof typeof PROJECT_PERMISSIONS];
export type RolePermission = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS];
export type Permission = typeof ALL_PERMISSIONS[keyof typeof ALL_PERMISSIONS];
