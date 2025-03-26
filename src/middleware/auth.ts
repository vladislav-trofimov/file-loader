import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

import { ERROR_MESSAGES } from '../constants';

import { StatusError } from '../interfaces';

dotenv.config();

const username = process.env.BASIC_AUTH_USERNAME;
const password = process.env.BASIC_AUTH_PASSWORD;

export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    const err: StatusError = new Error('Authentication required');
    err.status = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    return next(err);
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [incomingUsername, incomingPassword] = credentials.split(':');

  if (incomingUsername === username && incomingPassword === password) {
    return next();
  }

  const err: StatusError = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  err.status = 401;
  res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
  return next(err);
}
