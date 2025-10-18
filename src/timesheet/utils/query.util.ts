/**
 * Query utilities for consistent database operations
 */
export class QueryUtil {
  /**
   * Tạo where clause cho khoảng ngày làm việc
   */
  static workDateRange(startDate?: string, endDate?: string): any {
    if (!startDate || !endDate) return {};

    return {
      work_date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };
  }

  /**
   * Tạo where clause cho checkin range (deprecated - sẽ thay thế bằng work_date)
   * @deprecated Use workDateRange instead
   */
  static checkinRange(startDate?: string, endDate?: string): any {
    if (!startDate || !endDate) return {};

    return {
      checkin: {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
    };
  }

  /**
   * Tạo pagination options
   */
  static pagination(
    page: number = 1,
    limit: number = 20,
  ): {
    skip: number;
    take: number;
  } {
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  /**
   * Tạo response pagination metadata
   */
  static paginationMeta(
    page: number,
    limit: number,
    total: number,
  ): {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  } {
    return {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    };
  }
}
