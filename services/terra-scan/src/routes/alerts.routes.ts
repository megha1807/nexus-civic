import { Router } from 'express';
import { getAlerts, getAlert } from '../controllers/analysis.controller';

const router = Router();

// GET /api/alerts (public)
router.get('/', getAlerts);

// GET /api/alerts/:id (public)
router.get('/:id', getAlert);

export default router;
