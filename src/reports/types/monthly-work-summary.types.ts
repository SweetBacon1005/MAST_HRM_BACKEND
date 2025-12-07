import { DayOffDuration, DayOffType, ApprovalStatus, RemoteType } from '@prisma/client';

/**
 * Internal types for Monthly Work Summary module
 */

// Database query result types
export interface TimesheetRaw {
  id: number;
  user_id: number;
  work_date: Date;
  checkin: Date | null;
  checkout: Date | null;
  work_time_morning: number | null;
  work_time_afternoon: number | null;
  late_time: number | null;
  early_time: number | null;
  remote: RemoteType | null;
  status: ApprovalStatus | null;
  is_complete: boolean | null;
}

export interface DayOffRaw {
  id: number;
  user_id: number;
  work_date: Date;
  duration: DayOffDuration;
  type: DayOffType;
  status: ApprovalStatus;
  reason: string | null;
  approved_by: number | null;
  approved_at: Date | null;
}

export interface OvertimeRaw {
  id: number;
  user_id: number;
  work_date: Date;
  title: string;
  total_hours: number | null;
  status: ApprovalStatus | null;
  approved_by: number | null;
  approved_at: Date | null;
}

export interface HolidayRaw {
  id: number;
  name: string;
  start_date: Date;
  end_date: Date;
  type: string;
  status: string;
}

export interface UserWithInfo {
  id: number;
  email: string;
  user_information: {
    name: string | null;
    code: string | null;
    position: {
      name: string;
    } | null;
  } | null;
}

// Calculation result types
export interface LeaveDaysStats {
  totalLeaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  sickLeaveDays: number;
  otherLeaveDays: number;
}

export interface ViolationsStats {
  lateCount: number;
  earlyLeaveCount: number;
  totalLateMinutes: number;
  totalEarlyMinutes: number;
}

export interface WorkingSessionsStats {
  totalSessions: number;
  deductedSessions: number;
  finalSessions: number;
}

export interface OrganizationInfo {
  divisionName?: string;
  teamName?: string;
}

// Query filters
export interface MonthlyWorkSummaryFilters {
  divisionId?: number;
  teamId?: number;
  userIds?: string;
  search?: string;
}

// Date range
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Batch data for one user calculation
export interface UserMonthlyData {
  user: UserWithInfo;
  orgInfo: OrganizationInfo;
  timesheets: TimesheetRaw[];
  dayOffs: DayOffRaw[];
  overtimes: OvertimeRaw[];
  holidays: HolidayRaw[];
  expectedWorkDays: number;
}

// Request data with extended info
export interface RequestWithUser {
  id: number;
  user_id: number;
  work_date: Date;
  status: ApprovalStatus;
  approved_by: number | null;
  approved_at: Date | null;
  user?: {
    user_information: {
      name: string | null;
    } | null;
  };
}

export interface LateEarlyRequestRaw extends RequestWithUser {
  request_type: string;
  late_minutes: number | null;
  early_minutes: number | null;
  reason: string;
}

// Daily attendance computation
export interface DailyAttendanceData {
  date: Date;
  dayOfWeek: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  timesheet?: TimesheetRaw;
  dayOff?: DayOffRaw;
  hasRemoteRequest: boolean;
  hasLateEarlyRequest: boolean;
  hasForgotCheckinRequest: boolean;
  hasOvertimeRequest: boolean;
}

// Performance metrics
export interface PerformanceMetrics {
  attendanceRate: number;
  onTimeRate: number;
  completionRate: number;
  performanceLevel: 'excellent' | 'good' | 'average' | 'poor';
}
