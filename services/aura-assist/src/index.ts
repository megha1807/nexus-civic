import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from '@nexus-civic/db';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import queryRoutes from './routes/query.routes';
import { createLogger } from './utils/logger';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3011);
const mongoUri =
  process.env.MONGODB_URI ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017/nexus-civic';

const logger = createLogger(process.env.SERVICE_NAME ?? 'aura-assist');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

connectDB(mongoUri)
  .then(() => {
    logger.info('MongoDB connected for aura-assist');
  })
  .catch((error) => {
    logger.error('MongoDB connection failed for aura-assist', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

app.use('/api', queryRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'aura-assist',
    port,
    timestamp: new Date().toISOString(),
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`aura-assist listening on port ${port}`);
});
