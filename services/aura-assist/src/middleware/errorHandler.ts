import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import { createLogger } from '../utils/logger';

const logger = createLogger(process.env.SERVICE_NAME ?? 'aura-assist');

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = err.message;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  logger.error('Request failed', {
    statusCode,
    message,
    method: req.method,
    path: req.originalUrl,
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    code: statusCode,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 404,
  });
}
