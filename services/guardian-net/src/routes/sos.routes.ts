import { Router, type Request, type Response } from 'express';
import { SOSEvent } from '@nexus-civic/db';

import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { errorResponse, successResponse } from '../utils/response';
import { notifyNearbyVolunteers, sendSOSAlert } from '../utils/fcm';
import { triggerPoliceEscalation } from '../utils/superplane';
import { sosSchema } from '../validators/sos.validator';

const router = Router();

const Severity = {
  HIGH: 3,
  VERY_HIGH: 4,
  CRITICAL: 5,
} as const;

function deriveSeverity(type: 'hardware' | 'voice' | 'tap'): number {
  if (type === 'hardware') {
    return Severity.CRITICAL;
  }
  if (type === 'voice') {
    return Severity.VERY_HIGH;
  }
  return Severity.HIGH;
}

router.post(
  '/api/sos/trigger',
  validate(sosSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const payload = sosSchema.parse(req.body);

    const event = await SOSEvent.create({
      ...payload,
      severity: deriveSeverity(payload.type),
      status: 'ACTIVE',
    });

    const runId = await triggerPoliceEscalation(event.toObject());
    if (runId) {
      event.superplaneRunId = runId;
      await event.save();
    }

    await sendSOSAlert(event.toObject(), []);
    await notifyNearbyVolunteers(payload.location, String(event._id));

    res.status(201).json(successResponse(event, 'SOS event created'));
  })
);

router.get(
  '/api/sos/events',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(async (_req: Request, res: Response) => {
    const events = await SOSEvent.find().sort({ createdAt: -1 }).limit(200);
    res.json(successResponse(events));
  })
);

router.get(
  '/api/sos/events/:id',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(async (req: Request, res: Response) => {
    const event = await SOSEvent.findById(req.params.id);
    if (!event) {
      res.status(404).json(errorResponse('SOS event not found', 404));
      return;
    }

    res.json(successResponse(event));
  })
);

router.patch(
  '/api/sos/events/:id/resolve',
  authenticate,
  authorize(['admin', 'officer']),
  asyncHandler(async (req: Request, res: Response) => {
    const update: { status: 'RESOLVED'; resolvedBy?: string } = {
      status: 'RESOLVED',
    };

    if (req.user?.id) {
      update.resolvedBy = req.user.id;
    }

    const event = await SOSEvent.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      res.status(404).json(errorResponse('SOS event not found', 404));
      return;
    }

    res.json(successResponse(event, 'SOS event resolved'));
  })
);

export default router;
