import Redis from 'ioredis';
import logger from '../utils/logger';
import { ERROR_MESSAGES } from '../constants';

export class JobManagerService {
  private readonly redis: Redis;
  private readonly activeSetKey = 'active_jobs';
  private readonly maxActiveJobs = Number(process.env.MAX_ACTIVE_JOBS) || 5;
  private readonly rateLimitTTL = Number(process.env.RATE_LIMIT_TTL) || 10;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async registerActiveJob(jobId: string): Promise<void> {
    const activeCount = await this.redis.scard(this.activeSetKey);

    logger.info(`[MANAGER] Active count: ${activeCount} Max active jobs: ${this.maxActiveJobs}`);

    if (activeCount >= this.maxActiveJobs) {
      throw new Error(ERROR_MESSAGES.MAX_ACTIVE_JOBS_REACHED);
    }

    await this.redis.sadd(this.activeSetKey, jobId);
  }

  async unregisterActiveJob(jobId: string): Promise<void> {
    await this.redis.srem(this.activeSetKey, jobId);
  }

  async clearActiveJobs(): Promise<void> {
    await this.redis.del(this.activeSetKey);
  }

  async isLimitExceeded(ip: string): Promise<boolean> {
    const key = `ratelimit:${ip}`;
    const exists = await this.redis.exists(key);
    if (exists === 0) {
      await this.registerRateLimit(ip);
      return false;
    } else {
      return true;
    }
  }

  async registerRateLimit(ip: string): Promise<void> {
    const key = `ratelimit:${ip}`;
    await this.redis.set(key, '1', 'EX', this.rateLimitTTL);
  }
}
