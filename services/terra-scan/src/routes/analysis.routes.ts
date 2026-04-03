import { Router } from 'express';
import { triggerAnalysis, getAnalysis } from '../controllers/analysis.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// POST /api/analysis/trigger (admin only)
router.post('/trigger', requireAdmin, triggerAnalysis);

// GET /api/analysis/:jobId (public)
router.get('/:jobId', getAnalysis);

export default router;
