import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { createLogger, format, transports } from 'winston';

import donationsRoutes from './routes/donations.routes';
import ngosRoutes from './routes/ngos.routes';
import { errorHandler } from './middlewares/errorHandler';

const PORT = process.env.PORT || 3005;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus-civic';

// Configure logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/donations', donationsRoutes);
app.use('/api/ngos', ngosRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'near-give' });
});

// Error handling
app.use(errorHandler);

// Connect to MongoDB and start server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    app.listen(PORT, () => {
      logger.info(`Near-Give service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });
