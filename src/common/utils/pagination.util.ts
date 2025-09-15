export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginationResult {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export function buildPaginationQuery(options: PaginationOptions): PaginationResult {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 10, 100); // Giới hạn tối đa 100
  const skip = (page - 1) * limit;

  const result: PaginationResult = {
    skip,
    take: limit,
  };

  if (options.sort_by) {
    result.orderBy = {
      [options.sort_by]: options.sort_order || 'desc',
    };
  }

  return result;
}

export function buildPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data,
    pagination: {
      current_page: page,
      per_page: limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next_page: page < Math.ceil(total / limit),
      has_prev_page: page > 1,
    },
  };
}
