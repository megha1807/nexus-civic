import { Router } from 'express';

import {
  createGrievance,
  getGrievanceById,
  listGrievances,
  updateGrievanceStatus,
  uploadGrievanceMedia,
} from '../controllers/grievance.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadMiddleware } from '../utils/mediaHandler';
import { createGrievanceSchema, updateGrievanceStatusSchema } from '../validators/grievance.validator';

const router = Router();

router.post('/api/grievances', optionalAuth, validate(createGrievanceSchema), asyncHandler(createGrievance));

router.get('/api/grievances', authenticate, authorize(['admin', 'officer']), asyncHandler(listGrievances));

router.get('/api/grievances/:id', authenticate, asyncHandler(getGrievanceById));

router.patch(
  '/api/grievances/:id/status',
  authenticate,
  authorize(['admin', 'officer']),
  validate(updateGrievanceStatusSchema),
  asyncHandler(updateGrievanceStatus)
);

router.post(
  '/api/grievances/:id/media',
  optionalAuth,
  uploadMiddleware,
  asyncHandler(uploadGrievanceMedia)
);

export default router;
