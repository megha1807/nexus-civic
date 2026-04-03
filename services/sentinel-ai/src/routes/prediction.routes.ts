import { Router } from 'express';
import {
  getHeatmap,
  getTopZones,
  triggerDispatch,
  getActiveDispatches,
  acknowledgeDispatch,
} from '../controllers/prediction.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Routes: 
// GET /api/predictions/heatmap (admin) -> Mounted at /predictions
// GET /api/predictions/top-zones (admin) -> Mounted at /predictions
// POST /api/dispatch/trigger (admin) -> Mounted at /dispatch
// GET /api/dispatch/active (admin+officer) -> Mounted at /dispatch
// POST /api/dispatch/:id/ack (officer) -> Mounted at /dispatch

// Note: Usually we split into predictionRoutes and dispatchRoutes for exact matching

router.get('/predictions/heatmap', authenticate, authorize(['admin']), getHeatmap);
router.get('/predictions/top-zones', authenticate, authorize(['admin']), getTopZones);

router.post('/dispatch/trigger', authenticate, authorize(['admin']), triggerDispatch);
router.get('/dispatch/active', authenticate, authorize(['admin', 'officer']), getActiveDispatches);
router.post('/dispatch/:id/ack', authenticate, authorize(['officer']), acknowledgeDispatch);

export default router;
