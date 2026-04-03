import { Router, type Request, type Response } from 'express';
import type { ZodIssue } from 'zod';
import { SOSEvent } from '@nexus-civic/db';

import { asyncHandler } from '../middleware/asyncHandler';
import { errorResponse, successResponse } from '../utils/response';
import { safetyQuerySchema } from '../validators/sos.validator';

const router = Router();

type NearbyEvent = {
  _id: unknown;
  location: {
    lat: number;
    lng: number;
  };
  severity: number;
  status: string;
  createdAt: Date;
};

async function getNearbyEvents(lat: number, lng: number, radiusKm: number): Promise<NearbyEvent[]> {
  return (await SOSEvent.find({
    location: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radiusKm / 6378.1],
      },
    },
  }).lean()) as unknown as NearbyEvent[];
}

function parseSafetyQuery(req: Request, res: Response): { lat: number; lng: number; radiusKm: number } | null {
  const parsed = safetyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue: ZodIssue) => ({
      field: issue.path.join('.') || 'query',
      message: issue.message,
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 400,
      details,
    });
    return null;
  }

  return parsed.data;
}

router.get(
  '/api/safety/heatmap',
  asyncHandler(async (req: Request, res: Response) => {
    const query = parseSafetyQuery(req, res);
    if (!query) {
      return;
    }

    const events = await getNearbyEvents(query.lat, query.lng, query.radiusKm);
    const points = events.map((event) => ({
      id: String(event._id),
      lat: event.location.lat,
      lng: event.location.lng,
      severity: event.severity,
      status: event.status,
      createdAt: event.createdAt,
    }));

    res.json(successResponse(points));
  })
);

router.get(
  '/api/safety/score',
  asyncHandler(async (req: Request, res: Response) => {
    const query = parseSafetyQuery(req, res);
    if (!query) {
      return;
    }

    const events = await getNearbyEvents(query.lat, query.lng, query.radiusKm);
    const avgSeverity =
      events.length > 0
        ? events.reduce((sum: number, event: NearbyEvent) => sum + Number(event.severity), 0) /
          events.length
        : 0;

    const riskScore = Math.min(100, Math.round(avgSeverity * 20));

    res.json(
      successResponse({
        lat: query.lat,
        lng: query.lng,
        radiusKm: query.radiusKm,
        nearbyEvents: events.length,
        riskScore,
      })
    );
  })
);

router.get(
  '/api/safety/nearby-events',
  asyncHandler(async (req: Request, res: Response) => {
    const query = parseSafetyQuery(req, res);
    if (!query) {
      return;
    }

    const events = await getNearbyEvents(query.lat, query.lng, query.radiusKm);
    if (events.length === 0) {
      res.json(successResponse([]));
      return;
    }

    res.json(successResponse(events));
  })
);

export default router;
