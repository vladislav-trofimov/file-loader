import { Request, Response, RequestHandler } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { extractFileFromRequest } from '../utils/extractFileName';
import { getValidFolderName } from '../utils/getValidFolderName';
import logger from '../utils/logger';
import { JobManagerService } from '../services/jobManager';
import { runWithRetry } from '../runWorker';
import redisClient, { isRedisReady } from '../connection/redis';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants';

const jobManager = new JobManagerService(redisClient);

export const uploadHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const isReady = await isRedisReady();
  if (!isReady) {
    logger.error('Redis is not ready');
    res.status(500).send({ message: ERROR_MESSAGES.SERVICE_UNAVAILABLE });
    return;
  }

  const clientId = req.ip!;
  logger.info(`[UPLOAD] start client=${clientId}`);

  const clientFolderName = getValidFolderName(clientId);
  const isLimitExceeded = await jobManager.isLimitExceeded(clientId);

  if (isLimitExceeded) {
    logger.warn(`Client ${clientId} exceeded the limit of concurrent uploads`);
    res.status(429).send({ message: ERROR_MESSAGES.TOO_MANY_REQUESTS });
    return;
  }

  const jobId = uuidv4();
  try {
    await jobManager.registerActiveJob(jobId);
    const { filename, fileStream } = await extractFileFromRequest(req);

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', clientFolderName);
    await fs.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);

    await runWithRetry(jobId, filePath, fileStream);

    res.status(202).send({ jobId, message: SUCCESS_MESSAGES.UPLOAD_COMPLETE });
    logger.info(`[UPLOAD] end client=${clientId} jobId=${jobId}`);
  } catch (err) {
    logger.error(`Failed to upload file: ${(err as Error).message}`);
    if ((err as Error).message === ERROR_MESSAGES.MAX_ACTIVE_JOBS_REACHED) {
      res.status(429).send({ message: ERROR_MESSAGES.MAX_ACTIVE_JOBS_REACHED });
      return;
    }
    res.status(500).send({ message: ERROR_MESSAGES.UPLOAD_FAILED });
  } finally {
    jobManager.unregisterActiveJob(jobId).catch((err) => {
      logger.error(`Failed to unregister job: ${(err as Error).message}`);
    });
  }
};
