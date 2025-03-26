import Redis from 'ioredis';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: () => null,
  connectTimeout: 5000,
};

const redis = new Redis(redisConnection);

redis.on('error', (err) => {
  logger.error('[REDIS ERROR]', err.message);
});

redis.on('connect', () => {
  logger.info('[REDIS] Connected');
});

redis.on('ready', () => {
  logger.info('[REDIS] Ready to use');
});

redis.on('close', () => {
  logger.warn('[REDIS] Connection closed');
});

export async function isRedisReady(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (err) {
    return false;
  }
}

export default redis;
