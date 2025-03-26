import { spawn } from 'child_process';
import { Readable } from 'stream';
import path from 'path';
import { pipeline } from 'stream/promises';
import CircuitBreaker from 'opossum';

import logger from './utils/logger';

export async function runWorkerStream(
  jobId: string,
  filePath: string,
  inputStream: Readable,
): Promise<void> {
  const workerPath = path.join(__dirname, '..', 'dist', 'worker.js');
  const worker = spawn('node', [workerPath, filePath], {
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  try {
    logger.info(`[WORKER] Piping stream for job ${jobId}`);
    await pipeline(inputStream, worker.stdin);
    logger.info(`[WORKER] Finished piping stream for job ${jobId}`);
  } catch (err) {
    logger.error(`[WORKER] Failed to pipe stream for job ${jobId}:`);
    worker.kill();
    throw err;
  }

  return new Promise((resolve, reject) => {
    worker.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Worker failed with code ${code}`));
    });

    worker.on('error', (err) => {
      reject(err);
    });
  });
}

const breakerOptions = {
  timeout: 25000, // 25 seconds max task time
  errorThresholdPercentage: 30, // if 30% of requests fail
  resetTimeout: 30000, // 30 seconds - after 30 seconds, try again
};

const runWorkerWithBreaker = new CircuitBreaker(runWorkerStream, breakerOptions);

export async function runWithRetry(
  jobId: string,
  filePath: string,
  inputStream: Readable,
): Promise<void> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info(`[ATTEMPT] ${attempt} for job ${jobId}`);

      if (runWorkerWithBreaker.opened) {
        throw new Error('Circuit breaker is open');
      }

      await runWorkerWithBreaker.fire(jobId, filePath, inputStream);
      return;
    } catch (err) {
      logger.warn(`[RETRY] Attempt ${attempt} failed for job ${jobId}:`, err);
      if (attempt === maxAttempts) throw err;

      const delay = Math.pow(2, attempt) * 1000;
      logger.warn(`[RETRY] Waiting ${delay}ms before next attempt for job ${jobId}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
