import { Injectable } from '@nestjs/common';
import {
  AttendanceLogWhereInput,
  DateRangeFilter,
  TimesheetWhereInput,
} from '../types/prisma-where.types';
@Injectable()
export class QueryBuilderService {
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

  builduser_idsFilter(
    user_ids: number[],
  ): { in: number[] } | Record<string, never> {
    if (!user_ids || user_ids.length === 0) {
      return {};
    }

    return { in: user_ids };
  }

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

  buildNotDeletedFilter(): { deleted_at: null } {
    return { deleted_at: null };
  }

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


    return where;
  }

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
}
