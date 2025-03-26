import os from 'os';
import SystemMonitorService from '../../../src/services/systemMonitor';
import type Redis from 'ioredis';

jest.mock('os');

describe('SystemMonitorService', () => {
  let redisMock: jest.Mocked<Redis>;
  let service: SystemMonitorService;

  beforeEach(() => {
    redisMock = {
      ping: jest.fn(),
    } as any;

    service = new SystemMonitorService(redisMock);
  });

  describe('getSystemMetrics', () => {
    it('should calculate cpu usage and memory stats correctly', () => {
      (os.cpus as jest.Mock).mockReturnValue([
        { times: { user: 100, nice: 50, sys: 150, idle: 200, irq: 0 } },
        { times: { user: 200, nice: 100, sys: 100, idle: 300, irq: 0 } },
      ]);
      (os.freemem as jest.Mock).mockReturnValue(2048);
      (os.totalmem as jest.Mock).mockReturnValue(4096);

      const result = service.getSystemMetrics();

      const expectedIdle = 200 + 300; // 500
      const expectedTotal = 100+50+150+200+0 + 200+100+100+300+0; // 1200
      const expectedCpuUsage = 1 - expectedIdle / expectedTotal; // ~0.583

      expect(result.cpuUsage).toBeCloseTo(expectedCpuUsage, 3);
      expect(result.freeMemory).toBe(2048);
      expect(result.totalMemory).toBe(4096);
    });
  });

  describe('isSystemUnderPressure', () => {
    it('should return false when under threshold', () => {
      jest.spyOn(service, 'getSystemMetrics').mockReturnValue({
        cpuUsage: 0.5,
        freeMemory: 1000,
        totalMemory: 4000,
      });

      const result = service.isSystemUnderPressure();
      expect(result).toBe(false);
    });

    it('should return true when CPU is too high', () => {
      jest.spyOn(service, 'getSystemMetrics').mockReturnValue({
        cpuUsage: 0.95,
        freeMemory: 1000,
        totalMemory: 4000,
      });

      const result = service.isSystemUnderPressure();
      expect(result).toBe(true);
    });

    it('should return true when memory is too low', () => {
      jest.spyOn(service, 'getSystemMetrics').mockReturnValue({
        cpuUsage: 0.5,
        freeMemory: 100,
        totalMemory: 4000,
      });

      const result = service.isSystemUnderPressure();
      expect(result).toBe(true);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy if Redis responds with PONG', async () => {
      redisMock.ping.mockResolvedValue('PONG');

      jest.spyOn(service, 'getSystemMetrics').mockReturnValue({
        cpuUsage: 0.1,
        freeMemory: 1000,
        totalMemory: 2000,
      });

      const result = await service.getHealthStatus();

      expect(result.status).toBe('ok');
      expect(result.dependencies.redis).toBe('healthy');
      expect(result.metrics).toEqual({
        cpuUsage: 0.1,
        freeMemory: 1000,
        totalMemory: 2000,
      });
      expect(typeof result.timestamp).toBe('string');
    });

    it('should return unreachable if Redis throws', async () => {
      redisMock.ping.mockRejectedValue(new Error('Connection failed'));

      jest.spyOn(service, 'getSystemMetrics').mockReturnValue({
        cpuUsage: 0.2,
        freeMemory: 1000,
        totalMemory: 2000,
      });

      const result = await service.getHealthStatus();

      expect(result.dependencies.redis).toBe('unreachable');
    });
  });
});