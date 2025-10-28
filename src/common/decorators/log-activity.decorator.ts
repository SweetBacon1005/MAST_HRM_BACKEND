import { SetMetadata } from '@nestjs/common';

export interface LogActivityOptions {
  logName: string;
  description: string;
  event: string;
  subjectType: string;
  // Function để extract subject ID từ parameters hoặc result
  getSubjectId?: (args: any[], result?: any) => number;
  // Function để extract properties từ parameters hoặc result
  getProperties?: (args: any[], result?: any) => Record<string, any>;
  // Có log khi thành công không
  logOnSuccess?: boolean;
  // Có log khi có lỗi không
  logOnError?: boolean;
}

export const LOG_ACTIVITY_KEY = 'log_activity';

/**
 * Decorator để tự động log activity
 * 
 * @example
 * @LogActivity({
 *   logName: 'Request Management',
 *   description: 'Tạo đơn remote work',
 *   event: 'request.created',
 *   subjectType: 'Request',
 *   getSubjectId: (args, result) => result.data.id,
 *   getProperties: (args) => ({ request_type: 'remote_work', work_date: args[0].work_date })
 * })
 * async createRemoteWorkRequest(dto: CreateRemoteWorkRequestDto) {
 *   // method implementation
 * }
 */
export const LogActivity = (options: LogActivityOptions) => 
  SetMetadata(LOG_ACTIVITY_KEY, options);
