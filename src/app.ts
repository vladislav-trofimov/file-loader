import express, { Request, Response, NextFunction } from 'express';

import { basicAuth } from './middleware/auth';
import { systemLoadGuard } from './middleware/systemLoadGuard';
import { uploadHandler } from './controllers/uploadController';
import { healthHandler } from './controllers/healthController';
import { JobManagerService } from './services/jobManager';
import redisClient from './connection/redis';
import logger from './utils/logger';
import { ERROR_MESSAGES } from './constants';

const jobManager = new JobManagerService(redisClient);
const app = express();

app.use(express.json());

app.get('/health', basicAuth, healthHandler);

app.post('/upload', systemLoadGuard, basicAuth, uploadHandler);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  logger.error(`[ERROR] ${status} - ${message}`);
  res.status(status).json({ message: message });
});

export { app, jobManager };
