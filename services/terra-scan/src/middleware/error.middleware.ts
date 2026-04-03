import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('[Error]', err.stack || err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({ error: 'Endpoint not found' });
};
