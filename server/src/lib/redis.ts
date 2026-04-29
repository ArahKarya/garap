// ioredis v5 ships ESM with a default export; in NodeNext + esModuleInterop,
// the constructor lives on `.default`. Use the named `Redis` export instead.
import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const createRedisConnection = (): Redis =>
  new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

export const redis = createRedisConnection();
