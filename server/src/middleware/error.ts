import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { fail } from '@panggonmikir/shared';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isProduction } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(422).json(fail('VALIDATION_ERROR', 'Validasi gagal', err.flatten()));
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json(fail(err.code, err.message, err.details));
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res
    .status(500)
    .json(fail('INTERNAL_ERROR', 'Terjadi kesalahan server', isProduction ? undefined : String(err)));
};

export const notFoundHandler = (_req: unknown, res: any) => {
  res.status(404).json(fail('NOT_FOUND', 'Endpoint tidak ditemukan'));
};
