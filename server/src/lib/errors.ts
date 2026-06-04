export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const NotFoundError = (entity: string, id?: string) =>
  new AppError('NOT_FOUND', `${entity}${id ? ` ${id}` : ''} tidak ditemukan`, 404);

export const UnauthorizedError = (message = 'Unauthorized') =>
  new AppError('UNAUTHORIZED', message, 401);

export const ForbiddenError = (message = 'Akses ditolak') =>
  new AppError('FORBIDDEN', message, 403);

export const ConflictError = (message: string) => new AppError('CONFLICT', message, 409);

export const ValidationError = (message: string, details?: unknown) =>
  new AppError('VALIDATION_ERROR', message, 422, details);

/** Batas paket (kuota) tercapai — sinyal untuk upgrade. HTTP 402. */
export const QuotaError = (message: string, details?: unknown) =>
  new AppError('QUOTA_EXCEEDED', message, 402, details);
