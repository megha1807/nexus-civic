import { Router } from 'express';
import { z } from 'zod';

import {
  getAuditLogs,
  getCapabilities,
  handleQuery,
  transcribeVoice,
} from '../controllers/query.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const querySchema = z.object({
  query: z.string().min(1),
  intendedAction: z.string().min(1).optional(),
  targetModule: z.string().min(1).optional(),
});

const voiceSchema = z.object({
  transcript: z.string().min(1).optional(),
  audioUrl: z.string().url().optional(),
  language: z.string().min(2).optional(),
}).refine((data) => Boolean(data.transcript || data.audioUrl), {
  message: 'Either transcript or audioUrl is required',
});

// POST /api/query (authenticate)
router.post('/query', authenticate, validate(querySchema), asyncHandler(handleQuery));

// GET /api/audit-logs (admin only)
router.get('/audit-logs', authenticate, requireAdmin, asyncHandler(getAuditLogs));

// GET /api/capabilities (optionalAuth)
router.get('/capabilities', optionalAuth, asyncHandler(getCapabilities));

// POST /api/voice/transcribe (authenticate)
router.post('/voice/transcribe', authenticate, validate(voiceSchema), asyncHandler(transcribeVoice));

export default router;
