import Redis from 'ioredis';
import os from 'os';

import logger from '../utils/logger';

class SystemMonitorService {
  constructor(private readonly redis: Redis) {}

  getSystemMetrics(): {
    cpuUsage: number;
    freeMemory: number;
    totalMemory: number;
  } {
    const cpus = os.cpus();
    const idleMs = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalMs = cpus.reduce((acc, cpu) => {
      const { user, nice, sys, idle, irq } = cpu.times;
      return acc + user + nice + sys + idle + irq;
    }, 0);

    const cpuUsage = 1 - idleMs / totalMs;
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();

    return {
      cpuUsage,
      freeMemory,
      totalMemory,
    };
  }

  isSystemUnderPressure(cpuThreshold = 0.9, minFreeMemoryRatio = 0.1): boolean {
    const { cpuUsage, freeMemory, totalMemory } = this.getSystemMetrics();
    const memoryRatio = freeMemory / totalMemory;

    logger.info(
      `[SYSTEM] CPU: ${(cpuUsage * 100).toFixed(2)}% | Free memory: ${(memoryRatio * 100).toFixed(2)}%`,
    );

    return cpuUsage > cpuThreshold || memoryRatio < minFreeMemoryRatio;
  }

  async getHealthStatus() {
    let redisStatus = 'unknown';

    try {
      const pong = await this.redis.ping();
      redisStatus = pong === 'PONG' ? 'healthy' : 'unreachable';
    } catch {
      redisStatus = 'unreachable';
    }

    return {
      status: 'ok',
      metrics: this.getSystemMetrics(),
      dependencies: {
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export default SystemMonitorService;
