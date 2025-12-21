export enum RequestType {
  DAY_OFF = 'day-off',
  OVERTIME = 'overtime',
  REMOTE_WORK = 'remote-work',
  LATE_EARLY = 'late-early',
  FORGOT_CHECKIN = 'forgot-checkin',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface BaseRequestResponse {
  id: number;
  type: RequestType;
  status: RequestStatus;
  user_id: number;
  created_at: Date;
  updated_at: Date;
  approved_by?: number;
  approved_at?: Date;
  rejected_reason?: string;
}

export interface DayOffRequestResponse extends BaseRequestResponse {
  type: RequestType.DAY_OFF;
  work_date: Date;
  duration: string;
  title: string;
  reason?: string;
  note?: string;
}

export interface OvertimeRequestResponse extends BaseRequestResponse {
  type: RequestType.OVERTIME;
  work_date: Date;
  title: string;
  start_time: string;
  end_time: string;
  total_hours?: number;
  hourly_rate?: number;
  total_amount?: number;
  project_id?: number;
  reason?: string;
}

export interface RemoteWorkRequestResponse extends BaseRequestResponse {
  type: RequestType.REMOTE_WORK;
  work_date: Date;
  remote_type: 'REMOTE' | 'HYBRID';
  title: string;
  reason?: string;
}

export interface LateEarlyRequestResponse extends BaseRequestResponse {
  type: RequestType.LATE_EARLY;
  work_date: Date;
  request_type: 'LATE' | 'EARLY' | 'BOTH';
  title: string;
  late_minutes?: number;
  early_minutes?: number;
  reason: string;
}

export interface ForgotCheckinRequestResponse extends BaseRequestResponse {
  type: RequestType.FORGOT_CHECKIN;
  work_date: Date;
  checkin_time?: string;
  checkout_time?: string;
  title: string;
  reason: string;
  timesheet_id?: number;
}

export type RequestResponse =
  | DayOffRequestResponse
  | OvertimeRequestResponse
  | RemoteWorkRequestResponse
  | LateEarlyRequestResponse
  | ForgotCheckinRequestResponse;

export interface RequestValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ApprovalResult {
  success: boolean;
  message: string;
  data?: any;
}
