import { Injectable } from '@nestjs/common';
import {
  TimesheetWhereInput,
  AttendanceLogWhereInput,
  DayOffWhereInput,
  DateRangeFilter,
  FilterBuilderOptions,
} from '../types/prisma-where.types';

/**
 * Service để build Prisma where clauses (TYPE-SAFE)
 * Giảm code trùng lặp khi xây dựng filters
 */
@Injectable()
export class QueryBuilderService {
  /**
   * Build date range filter - TYPE SAFE
   */
  buildDateRangeFilter(
    startDate?: string | Date,
    endDate?: string | Date,
  ): DateRangeFilter {
    if (!startDate || !endDate) {
      return {};
    }

    return {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  /**
   * Build user IDs filter - TYPE SAFE
   */
  builduser_idsFilter(user_ids: number[]): { in: number[] } | Record<string, never> {
    if (!user_ids || user_ids.length === 0) {
      return {};
    }

    return { in: user_ids };
  }

  /**
   * Build status filter - TYPE SAFE
   */
  buildStatusFilter<T extends string>(
    status?: T | T[],
  ): { status: T | { in: T[] } } | Record<string, never> {
    if (!status) {
      return {};
    }

    if (Array.isArray(status)) {
      return { status: { in: status } };
    }

    return { status };
  }

  /**
   * Build default deleted_at filter - TYPE SAFE
   */
  buildNotDeletedFilter(): { deleted_at: null } {
    return { deleted_at: null };
  }

  /**
   * Build complete where clause cho timesheet queries - TYPE SAFE
   */
  buildTimesheetWhereClause(params: {
    startDate?: string;
    endDate?: string;
    user_ids?: number[];
    status?: string;
  }): TimesheetWhereInput {
    const { startDate, endDate, user_ids, status } = params;

    const where: TimesheetWhereInput = {
      deleted_at: null,
    };

    if (startDate && endDate) {
      where.work_date = this.buildDateRangeFilter(startDate, endDate);
    }

    if (user_ids && user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    if (status) {
      where.status = status as any; // Prisma enum
    }

    return where;
  }

  /**
   * Build attendance log where clause - TYPE SAFE
   */
  buildAttendanceLogWhereClause(params: {
    startDate?: string;
    endDate?: string;
    user_ids?: number[];
  }): AttendanceLogWhereInput {
    const { startDate, endDate, user_ids } = params;

    const where: AttendanceLogWhereInput = {
      deleted_at: null,
    };

    if (startDate && endDate) {
      where.timestamp = this.buildDateRangeFilter(startDate, endDate);
    }

    if (user_ids && user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    return where;
  }

  /**
   * Build day off (leave) where clause - TYPE SAFE
   */
  buildDayOffWhereClause(params: {
    startDate?: string;
    endDate?: string;
    user_ids?: number[];
    status?: string;
  }): DayOffWhereInput {
    const { startDate, endDate, user_ids, status } = params;

    const where: DayOffWhereInput = {
      deleted_at: null,
    };

    if (startDate && endDate) {
      where.work_date = this.buildDateRangeFilter(startDate, endDate);
    }

    if (user_ids && user_ids.length > 0) {
      where.user_id = { in: user_ids };
    }

    if (status) {
      where.status = status as any; // Prisma enum
    }

    return where;
  }

  /**
   * Combine filters - TYPE SAFE
   */
  combineFilters<T extends Record<string, any>>(...filters: Partial<T>[]): Partial<T> {
    return filters.reduce((acc, filter) => {
      return { ...acc, ...filter };
    }, {} as Partial<T>);
  }
}

