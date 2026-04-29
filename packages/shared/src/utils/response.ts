import type { ApiResponse } from '../schemas/common.js';

export const ok = <T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
  ...(meta ? { meta } : {}),
});

export const fail = (
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<null> => ({
  success: false,
  data: null,
  error: { code, message, ...(details !== undefined ? { details } : {}) },
});
