import { Request, Response, RequestHandler } from 'express';
import logger from '../utils/logger';
import redisConnection from '../connection/redis';
import SystemMonitorService from '../services/systemMonitor';
import { ERROR_MESSAGES } from '../constants';

export const healthHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const monitor = new SystemMonitorService(redisConnection);
    const status = await monitor.getHealthStatus();
    logger.info('[HEALTH] Successfully got health status');
    res.status(200).json(status);
  } catch (err) {
    logger.error('[HEALTH] Failed to get health status');
    res.status(500).json({ status: ERROR_MESSAGES.SERVICE_UNAVAILABLE });
  }
};
