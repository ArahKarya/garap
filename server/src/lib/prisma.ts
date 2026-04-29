import { PrismaClient } from '@prisma/client';
import { env, isProduction } from '../config/env.js';

export const prisma = new PrismaClient({
  log: isProduction ? ['error'] : ['warn', 'error'],
  datasources: { db: { url: env.DATABASE_URL } },
});

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
