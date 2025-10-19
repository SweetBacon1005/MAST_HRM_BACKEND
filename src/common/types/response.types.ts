/**
 * Type-safe response types
 * Replace 'any' with proper typed responses
 */

/**
 * Pagination response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Generic API response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Statistics response
 */
export interface StatsResponse {
  total: number;
  [key: string]: number | string | boolean | null;
}

/**
 * User statistics
 */
export interface UserStats {
  user_id: number;
  user_name?: string;
  total_days: number;
  total_work_hours: number;
  total_ot_hours: number;
  total_late_minutes: number;
  total_early_minutes: number;
  total_fines?: number;
  attendance_rate?: number;
  days_remote?: number;
  on_time_days?: number;
  late_days?: number;
  early_leave_days?: number;
  remote_days?: number;
  total_penalties?: number;
}

export interface UserStatsMap {
  [userId: number]: UserStats;
}

/**
 * Grouped statistics by period
 */
export interface PeriodStats {
  period: string;
  total_records: number;
  total_work_hours: number;
  average_work_hours: number;
  total_late_count: number;
  total_early_count: number;
  attendance_rate: number;
  [key: string]: string | number;
}

/**
 * Violation statistics
 */
export interface ViolationStats {
  user_id: number;
  user_name?: string;
  total_violations: number;
  total_penalties: number;
  late_count?: number;
  total_late_minutes?: number;
  early_leave_count?: number;
  total_early_minutes?: number;
  violation_types?: {
    [type: string]: number;
  };
}

/**
 * Leave balance (matching Prisma schema)
 */
export interface LeaveBalance {
  id: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  user_id: number;
  paid_leave_balance: number;
  unpaid_leave_balance: number;
  annual_paid_leave_quota: number;
  carry_over_days: number;
  last_reset_date: Date | null;
}

/**
 * CSV export data
 */
export type CsvRecord = Record<string, string | number | boolean | null>;

/**
 * Field mapping for CSV headers
 */
export type FieldMapping = Record<string, string>;

/**
 * Generic grouped data
 */
export type GroupedData<T = unknown> = Record<string, T>;

/**
 * Key-value pair
 */
export interface KeyValue<T = unknown> {
  [key: string]: T;
}

