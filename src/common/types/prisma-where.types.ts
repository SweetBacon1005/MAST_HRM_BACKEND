import { Prisma } from '@prisma/client';

/**
 * Type-safe Prisma Where clause builders
 * Replace 'any' with proper Prisma types
 */

// Time sheets
export type TimesheetWhereInput = Prisma.time_sheetsWhereInput;
export type TimesheetOrderByInput = Prisma.time_sheetsOrderByWithRelationInput;

// Attendance logs
export type AttendanceLogWhereInput = Prisma.attendance_logsWhereInput;
export type AttendanceLogOrderByInput =
  Prisma.attendance_logsOrderByWithRelationInput;

// Day offs (Leave requests)
export type DayOffWhereInput = Prisma.day_offsWhereInput;
export type DayOffOrderByInput = Prisma.day_offsOrderByWithRelationInput;

// Overtime records
export type OvertimeWhereInput = Prisma.over_times_historyWhereInput;
export type OvertimeOrderByInput =
  Prisma.over_times_historyOrderByWithRelationInput;

// Late/Early requests
export type LateEarlyRequestWhereInput = Prisma.late_early_requestsWhereInput;
export type LateEarlyRequestOrderByInput =
  Prisma.late_early_requestsOrderByWithRelationInput;

// Remote work requests
export type RemoteWorkWhereInput = Prisma.remote_work_requestsWhereInput;
export type RemoteWorkOrderByInput =
  Prisma.remote_work_requestsOrderByWithRelationInput;

// Violations (no table in schema, using attendance_logs for now)
export type ViolationWhereInput = Prisma.attendance_logsWhereInput;
export type ViolationOrderByInput = Prisma.attendance_logsOrderByWithRelationInput;

// Personnel transfers/rotation members
export type RotationMemberWhereInput = Prisma.rotation_membersWhereInput;
export type RotationMemberOrderByInput =
  Prisma.rotation_membersOrderByWithRelationInput;

// Users
export type UserWhereInput = Prisma.usersWhereInput;
export type UserOrderByInput = Prisma.usersOrderByWithRelationInput;

// User division
export type UserDivisionWhereInput = Prisma.user_divisionWhereInput;

// Projects
export type ProjectWhereInput = Prisma.projectsWhereInput;
export type ProjectOrderByInput = Prisma.projectsOrderByWithRelationInput;

// Penalty rules (using time_sheets for now)
export type PenaltyRuleWhereInput = Prisma.time_sheetsWhereInput;
export type PenaltyRuleOrderByInput = Prisma.time_sheetsOrderByWithRelationInput;

/**
 * Helper type for building date range filters
 */
export interface DateRangeFilter {
  gte?: Date;
  lte?: Date;
  gt?: Date;
  lt?: Date;
}

/**
 * Helper type for ID array filters
 */
export interface IdArrayFilter {
  in?: number[];
  notIn?: number[];
}

/**
 * Common filter builders
 */
export interface FilterBuilderOptions {
  startDate?: string | Date;
  endDate?: string | Date;
  userIds?: number[];
  divisionId?: number;
  teamId?: number;
  status?: string | string[];
  includeDeleted?: boolean;
}

