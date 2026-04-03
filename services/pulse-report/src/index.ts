import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import type { Request, Response } from 'express';
import { connectDB } from '@nexus-civic/db';

import { errorHandler } from './middleware/errorHandler';
import analyticsRoutes from './routes/analytics.routes';
import grievanceRoutes from './routes/grievance.routes';
import { createLogger } from './utils/logger';

const SERVICE_NAME = 'pulse-report';
const logger = createLogger(process.env.SERVICE_NAME ?? SERVICE_NAME);
const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

app.use(grievanceRoutes);
app.use(analyticsRoutes);

app.use(errorHandler);

async function startServer(): Promise<void> {
  const port = Number(process.env.PORT ?? 3002);
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to start pulse-report.');
  }

  await connectDB(mongoUri);
  logger.info('MongoDB connected.');

  app.listen(port, () => {
    logger.info('PulseReport service started.', { port });
  });
}

startServer().catch((error) => {
  logger.error('Failed to start PulseReport service.', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
