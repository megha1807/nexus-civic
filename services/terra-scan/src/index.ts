import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from '@nexus-civic/db';
import analysisRoutes from './routes/analysis.routes';
import alertsRoutes from './routes/alerts.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 3006;
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/nexus-civic';

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database Connection
connectDB(mongoUri).then(() => {
  console.log('MongoDB connected for TerraScan');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Routes
app.use('/api/analysis', analysisRoutes);
app.use('/api/alerts', alertsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'terra-scan' });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`TerraScan service listening on port ${port}`);
});
