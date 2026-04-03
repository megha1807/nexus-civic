import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';

import type { Request, Response } from 'express';
import { Grievance } from '@nexus-civic/db';

import { DEPARTMENT_ROUTING } from '../config/departments';
import { verifyMedia } from '../utils/mediaHandler';
import { createLogger } from '../utils/logger';
import { errorResponse, paginatedResponse, successResponse } from '../utils/response';
import { updateWorkflowStatus, triggerGrievancePipeline } from '../utils/superplane';
import { generateTicketId } from '../utils/ticketId';

const logger = createLogger(process.env.SERVICE_NAME ?? 'pulse-report');

type GrievancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const PRIORITY_SCORE_MAP: Record<GrievancePriority, number> = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 95,
};

function resolvePriority(value?: string): GrievancePriority {
  if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'CRITICAL') {
    return value;
  }
  return 'MEDIUM';
}

export async function createGrievance(req: Request, res: Response): Promise<void> {
  const payload = req.body as {
    title: string;
    description: string;
    category: string;
    location: { lat: number; lng: number; accuracy?: number; address?: string };
    priority?: string;
  };

  const departmentConfig = DEPARTMENT_ROUTING[payload.category] ?? DEPARTMENT_ROUTING.other;
  const priority = resolvePriority(payload.priority);
  const ticketId = await generateTicketId();
  const userId = req.user?.id ?? `anonymous-${randomUUID()}`;

  const grievance = await Grievance.create({
    ticketId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    location: payload.location,
    userId,
    departmentId: departmentConfig.departmentId,
    priority,
    priorityScore: PRIORITY_SCORE_MAP[priority],
    status: 'OPEN',
    statusHistory: [
      {
        status: 'OPEN',
        timestamp: new Date(),
        changedBy: req.user?.id ?? 'system',
      },
    ],
  });

  const runId = await triggerGrievancePipeline(grievance.toObject());
  if (runId) {
    grievance.superplaneRunId = runId;
    await grievance.save();
  }

  res.status(201).json(successResponse(grievance, 'Grievance submitted successfully'));
}

export async function listGrievances(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));

  const filter: Record<string, unknown> = {};
  if (typeof req.query.status === 'string') {
    filter.status = req.query.status;
  }
  if (typeof req.query.category === 'string') {
    filter.category = req.query.category;
  }

  const [rows, total] = await Promise.all([
    Grievance.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Grievance.countDocuments(filter),
  ]);

  res.json(
    paginatedResponse(rows, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    })
  );
}

export async function getGrievanceById(req: Request, res: Response): Promise<void> {
  const grievance = await Grievance.findById(req.params.id);
  if (!grievance) {
    res.status(404).json(errorResponse('Grievance not found', 404));
    return;
  }

  const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'officer';
  const isOwner = req.user?.id === grievance.userId;
  if (!isPrivileged && !isOwner) {
    res.status(403).json(errorResponse('Forbidden', 403));
    return;
  }

  res.json(successResponse(grievance));
}

export async function updateGrievanceStatus(req: Request, res: Response): Promise<void> {
  const body = req.body as { status: string; note?: string };

  const grievance = await Grievance.findByIdAndUpdate(
    req.params.id,
    {
      $set: { status: body.status },
      $push: {
        statusHistory: {
          status: body.status,
          timestamp: new Date(),
          note: body.note,
          changedBy: req.user?.id ?? 'system',
        },
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!grievance) {
    res.status(404).json(errorResponse('Grievance not found', 404));
    return;
  }

  if (grievance.superplaneRunId) {
    await updateWorkflowStatus(grievance.superplaneRunId, body.status, body.note);
  }

  res.json(successResponse(grievance, 'Grievance status updated'));
}

export async function uploadGrievanceMedia(req: Request, res: Response): Promise<void> {
  const mediaRequest = req as Request & {
    file?: {
      path: string;
    };
  };

  const grievance = await Grievance.findById(req.params.id);
  if (!grievance) {
    res.status(404).json(errorResponse('Grievance not found', 404));
    return;
  }

  if (!mediaRequest.file) {
    res.status(400).json(errorResponse('No media uploaded', 400));
    return;
  }

  const verification = await verifyMedia(mediaRequest.file.path, grievance.category);

  if (!verification.verified) {
    await fs.unlink(mediaRequest.file.path).catch(() => undefined);
    res.status(400).json(errorResponse('Uploaded media did not pass verification', 400));
    return;
  }

  const mediaUrls = [...(grievance.mediaUrls ?? []), verification.url];
  grievance.mediaUrls = mediaUrls;
  await grievance.save();

  res.status(201).json(successResponse({ mediaUrls }, 'Media attached to grievance'));

  fs.unlink(mediaRequest.file.path).catch((error) => {
    logger.warn('Failed to remove temporary upload file.', {
      filePath: mediaRequest.file?.path,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
