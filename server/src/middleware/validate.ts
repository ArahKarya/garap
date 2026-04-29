import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Keep original req[source] untouched for Express 5 — attach validated copy
    (req as any).validated = { ...((req as any).validated ?? {}), [source]: result.data };
    next();
  };

export const getValidated = <T>(req: any, source: Source = 'body'): T =>
  req.validated?.[source] as T;
