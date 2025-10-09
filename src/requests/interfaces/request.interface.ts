import { DayOffStatus, TimesheetStatus } from '@prisma/client';

export enum RequestType {
  DAY_OFF = 'day-off',
  OVERTIME = 'overtime',
  REMOTE_WORK = 'remote-work',
  LATE_EARLY = 'late-early',
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
  start_date: Date;
  end_date: Date;
  duration: string;
  total: number;
  reason?: string;
  note?: string;
  is_past: boolean;
}

export interface OvertimeRequestResponse extends BaseRequestResponse {
  type: RequestType.OVERTIME;
  date: Date;
  start_time: Date;
  end_time: Date;
  total?: number;
  value?: number;
  project_id?: number;
  reason?: string;
}

export interface RemoteWorkRequestResponse extends BaseRequestResponse {
  type: RequestType.REMOTE_WORK;
  work_date: Date;
  remote_type: 'REMOTE' | 'HYBRID';
  reason?: string;
  note?: string;
}

export interface LateEarlyRequestResponse extends BaseRequestResponse {
  type: RequestType.LATE_EARLY;
  work_date: Date;
  request_type: 'LATE' | 'EARLY' | 'BOTH';
  late_minutes?: number;
  early_minutes?: number;
  reason: string;
}

export type RequestResponse = 
  | DayOffRequestResponse 
  | OvertimeRequestResponse 
  | RemoteWorkRequestResponse
  | LateEarlyRequestResponse;

export interface RequestValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ApprovalResult {
  success: boolean;
  message: string;
  data?: any;
}
