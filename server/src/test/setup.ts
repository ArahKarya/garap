/**
 * Vitest global setup. Loads .env.test if present, falls back to .env.
 * Tests hit the real PostgreSQL container — never mock Prisma.
 */
import 'dotenv/config';
