import { Router } from 'express';

import {
  getAnalyticsSla,
  getAnalyticsSummary,
  getAnalyticsTrends,
} from '../controllers/analytics.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get(
  '/api/analytics/summary',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(getAnalyticsSummary)
);

router.get(
  '/api/analytics/trends',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(getAnalyticsTrends)
);

router.get('/api/analytics/sla', authenticate, authorize(['admin', 'officer']), asyncHandler(getAnalyticsSla));

export default router;
