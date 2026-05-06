import { Router } from 'express';
import { z } from 'zod';
import { ok } from '@panggonmikir/shared';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { validate, getValidated } from '../../middleware/validate.js';
import * as svc from './search.service.js';

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query wajib diisi').max(200),
  limit: z.coerce.number().int().positive().max(20).default(8),
  workspaceId: z.string().optional(),
});

type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchRouter = Router();

searchRouter.use(authenticate);

/**
 * Federated search across tasks, projects, links, notes, documents,
 * references, tags. Returns up to `limit` matches per entity.
 * Phase 3+ may upgrade to Postgres full-text search (tsvector + GIN).
 */
searchRouter.get(
  '/',
  validate(searchQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const q = getValidated<SearchQuery>(req, 'query');
      const result = await svc.search(q, { ownerId: req.user!.id });
      res.json(ok(result));
    } catch (err) {
      next(err);
    }
  },
);
