import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import type { Request, Response } from 'express';
import { connectDB } from '@nexus-civic/db';

import { errorHandler } from './middleware/errorHandler';
import sosRoutes from './routes/sos.routes';
import safetyRoutes from './routes/safety.routes';
import { initFirebase } from './utils/fcm';
import { createLogger } from './utils/logger';

const SERVICE_NAME = 'guardian-net';
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

app.use(sosRoutes);
app.use(safetyRoutes);

app.use(errorHandler);

async function startServer(): Promise<void> {
  const port = Number(process.env.PORT ?? 3001);
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to start guardian-net.');
  }

  await connectDB(mongoUri);
  logger.info('MongoDB connected.');

  initFirebase();

  app.listen(port, () => {
    logger.info('GuardianNet service started.', { port });
  });
}

startServer().catch((error) => {
  logger.error('Failed to start GuardianNet service.', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
