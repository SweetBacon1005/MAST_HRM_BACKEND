import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DateFormatUtil } from '../utils/date-format.util';

/**
 * Interceptor để tự động format các field thời gian trong response
 */
@Injectable()
export class DateFormatInterceptor implements NestInterceptor {
  // Các field cần format thành yyyy-mm-dd HH:MM:SS
  private readonly dateTimeFields = [
    'created_at',
    'updated_at',
    'deleted_at',
    'checkin',
    'checkout',
    'issued_at',
    'expires_at',
    'last_login',
    'verified_at',
    'sent_at',
    'approved_at',
    'rejected_at',
  ];

  // Các field cần format thành yyyy-mm-dd
  private readonly dateFields = [
    'birthday',
    'work_date',
    'start_date',
    'end_date',
    'date',
    'from_date',
    'to_date',
    'effective_date',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return this.formatDates(data);
      }),
    );
  }

  private formatDates(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.formatDates(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const formatted: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (this.dateTimeFields.includes(key)) {
          formatted[key] = DateFormatUtil.formatDateTime(value as any);
        } else if (this.dateFields.includes(key)) {
          formatted[key] = DateFormatUtil.formatDate(value as any);
        } else if (typeof value === 'object') {
          formatted[key] = this.formatDates(value);
        } else {
          formatted[key] = value;
        }
      }

      return formatted;
    }

    return obj;
  }
}
