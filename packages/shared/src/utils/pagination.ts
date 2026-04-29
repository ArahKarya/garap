import type { PaginatedResult } from '../schemas/pagination.js';

export const buildPagination = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> => ({
  items,
  meta: {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  },
});

export const toSkipTake = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  take: limit,
});
