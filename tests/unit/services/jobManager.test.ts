import { JobManagerService } from '../../../src/services/jobManager';
import type Redis from 'ioredis';

describe('JobManagerService', () => {
  let redisMock: jest.Mocked<Redis>;
  let service: JobManagerService;

  beforeEach(() => {
    redisMock = {
      scard: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      set: jest.fn(),
    } as any;

    service = new JobManagerService(redisMock);
  });

  describe('registerActiveJob', () => {
    it('should register job if under limit', async () => {
      redisMock.scard.mockResolvedValue(2);
      redisMock.sadd.mockResolvedValue(1);

      await service.registerActiveJob('job1');

      expect(redisMock.scard).toHaveBeenCalledWith('active_jobs');
      expect(redisMock.sadd).toHaveBeenCalledWith('active_jobs', 'job1');
    });

    it('should throw if active jobs limit is reached', async () => {
      redisMock.scard.mockResolvedValue(10); // больше, чем max (по умолчанию 5)

      await expect(service.registerActiveJob('job1')).rejects.toThrow('Max active jobs reached');
    });
  });

  describe('unregisterActiveJob', () => {
    it('should remove job from active set', async () => {
      redisMock.srem.mockResolvedValue(1);

      await service.unregisterActiveJob('job1');

      expect(redisMock.srem).toHaveBeenCalledWith('active_jobs', 'job1');
    });
  });

  describe('clearActiveJobs', () => {
    it('should delete the active set key', async () => {
      redisMock.del.mockResolvedValue(1);

      await service.clearActiveJobs();

      expect(redisMock.del).toHaveBeenCalledWith('active_jobs');
    });
  });

  describe('isLimitExceeded', () => {
    it('should return false if key does not exist and register rate limit', async () => {
      redisMock.exists.mockResolvedValue(0);
      redisMock.set.mockResolvedValue('OK');

      const result = await service.isLimitExceeded('1.2.3.4');

      expect(result).toBe(false);
      expect(redisMock.set).toHaveBeenCalledWith('ratelimit:1.2.3.4', '1', 'EX', 10);
    });

    it('should return true if key exists', async () => {
      redisMock.exists.mockResolvedValue(1);

      const result = await service.isLimitExceeded('1.2.3.4');

      expect(result).toBe(true);
      expect(redisMock.set).not.toHaveBeenCalled();
    });
  });

  describe('registerRateLimit', () => {
    it('should set key with expiration', async () => {
      redisMock.set.mockResolvedValue('OK');

      await service.registerRateLimit('1.2.3.4');

      expect(redisMock.set).toHaveBeenCalledWith('ratelimit:1.2.3.4', '1', 'EX', 10);
    });
  });
});