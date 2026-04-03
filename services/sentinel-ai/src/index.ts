import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from '@nexus-civic/db';
import predictionRoutes from './routes/prediction.routes';
import { runPredictionCycle } from './jobs/predictionJob';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api', predictionRoutes);

// Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexus-civic';

connectDB(MONGO_URI)
  .then(() => {
    console.log('[SentinelAI] Connected to database.');
    
    // Start Server
    app.listen(PORT, () => {
      console.log(`[SentinelAI] Server running on port ${PORT}`);
      
      // Start Jobs
      console.log('[SentinelAI] Scheduling prediction cycle...');
      const FIFTEEN_MINUTES = 15 * 60 * 1000;
      setInterval(runPredictionCycle, FIFTEEN_MINUTES);
      
      // Initial run after 10 seconds
      setTimeout(runPredictionCycle, 10 * 1000);
    });
  })
  .catch((err) => {
    console.error('[SentinelAI] Failed to connect to database', err);
    process.exit(1);
  });
