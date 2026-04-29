import IORedis from 'ioredis';
import { env } from '../config/env.js';

export const createRedisConnection = () =>
  new IORedis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

export const redis = createRedisConnection();
