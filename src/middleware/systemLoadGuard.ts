import { Request, Response, NextFunction } from 'express';
import SystemMonitorService from '../services/systemMonitor';
import { StatusError } from '../interfaces';
import redisConnection from '../connection/redis';
import { ERROR_MESSAGES } from './../constants';

export function systemLoadGuard(req: Request, res: Response, next: NextFunction): void {
  const monitor = new SystemMonitorService(redisConnection);
  if (monitor.isSystemUnderPressure()) {
    const err: StatusError = new Error(ERROR_MESSAGES.SYSTEM_UNDER_PRESSURE);
    err.status = 503;
    return next(err);
  }
  next();
}
