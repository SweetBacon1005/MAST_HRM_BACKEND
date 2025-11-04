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
  const limit = options.limit || 10;
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
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current_page: page,
      per_page: limit,
      total,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_prev_page: page > 1,
    },
  };
}

// Helper function để chuẩn hóa việc gọi buildPaginationResponse
export function buildPaginationResponseFromDto<T>(
  data: T[],
  total: number,
  paginationDto: PaginationOptions,
) {
  const page = paginationDto.page || 1;
  const limit = paginationDto.limit || 10;
  return buildPaginationResponse(data, total, page, limit);
}
