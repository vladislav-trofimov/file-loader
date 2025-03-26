import dotenv from 'dotenv';

dotenv.config();

import logger from './utils/logger';
import { app, jobManager } from './app';
import redisClient from './connection/redis';

const port = process.env.PORT || 8000;

let server: ReturnType<typeof app.listen>;

async function startServer() {
  jobManager.clearActiveJobs().catch((err) => {
    logger.error(err?.message || String(err));
  });

  server = app.listen(port, () => {
    logger.info(`Listening on port: ${port}`);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(`[UNCAUGHT EXCEPTION] ${err.stack || err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  if (reason instanceof Error) {
    logger.error(`[UNHANDLED REJECTION] ${reason.stack}`);
  } else {
    logger.error(`[UNHANDLED REJECTION] ${JSON.stringify(reason)}`);
  }
  process.exit(1);
});

//process.on('SIGINT', () => shutdown('SIGINT'));
//process.on('SIGTERM', () => shutdown('SIGTERM'));

async function shutdown(signal: string) {
  logger.info(`[SHUTDOWN] Received ${signal}. Closing gracefully...`);

  try {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    logger.info('[SHUTDOWN] HTTP server closed');

    await redisClient.quit();
    logger.info('[SHUTDOWN] Redis disconnected');

    process.exit(0);
  } catch (err: any) {
    logger.error(`[SHUTDOWN ERROR] ${err.stack || err.message}`);
    process.exit(1);
  }
}
