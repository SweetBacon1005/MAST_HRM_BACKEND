import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError } from 'rxjs';
import { ActivityLogService } from '../services/activity-log.service';
import { LOG_ACTIVITY_KEY, LogActivityOptions } from '../decorators/log-activity.decorator';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly activityLogService: ActivityLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logOptions = this.reflector.get<LogActivityOptions>(
      LOG_ACTIVITY_KEY,
      context.getHandler(),
    );

    if (!logOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const args = context.getArgs();

    if (!userId) {
      // Không có user ID, skip logging
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        if (logOptions.logOnSuccess !== false) {
          await this.logActivity(logOptions, args, result, userId);
        }
      }),
      catchError(async (error) => {
        if (logOptions.logOnError) {
          await this.logActivity(
            {
              ...logOptions,
              description: `${logOptions.description} - Lỗi: ${error.message}`,
              event: `${logOptions.event}.error`,
            },
            args,
            null,
            userId,
            error,
          );
        }
        throw error;
      }),
    );
  }

  private async logActivity(
    options: LogActivityOptions,
    args: any[],
    result: any,
    userId: number,
    error?: any,
  ): Promise<void> {
    try {
      const subjectId = options.getSubjectId 
        ? options.getSubjectId(args, result)
        : result?.data?.id || result?.id || userId;

      const properties = options.getProperties 
        ? options.getProperties(args, result)
        : {};

      if (error) {
        properties.error = error.message;
        properties.stack = error.stack;
      }

      await this.activityLogService.log({
        logName: options.logName,
        description: options.description,
        subjectType: options.subjectType,
        event: options.event,
        subjectId,
        causerId: userId,
        properties,
      });
    } catch (logError) {
      // Không throw error để không ảnh hưởng business logic
      console.error('Failed to log activity in interceptor:', logError);
    }
  }
}
