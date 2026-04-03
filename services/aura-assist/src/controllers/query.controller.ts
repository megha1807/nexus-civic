import type { Request, Response } from 'express';
import { AIAuditLog } from '@nexus-civic/db';
import { createGeminiClient } from '@nexus-civic/gemini-client';

import {
  ALL_KNOWN_ACTIONS,
  ALL_KNOWN_MODULES,
  evaluatePolicy,
  logDecision,
  POLICIES,
} from '../armoriq/policyEngine';
import { errorResponse, successResponse } from '../utils/response';

const geminiApiKey = process.env.GEMINI_API_KEY;
const gemini = geminiApiKey ? createGeminiClient(geminiApiKey) : null;

function getUserContext(req: Request): { userId: string; role: string } {
  return {
    userId: req.user?.id ?? 'anonymous',
    role: req.user?.role ?? 'citizen',
  };
}

export async function handleQuery(req: Request, res: Response): Promise<void> {
  const { userId, role } = getUserContext(req);
  const payload = req.body as {
    query: string;
    intendedAction?: string;
    targetModule?: string;
  };

  let intendedAction = payload.intendedAction;
  let targetModule = payload.targetModule;

  if ((!intendedAction || !targetModule) && gemini) {
    const intent = await gemini.detectIntent(payload.query, ALL_KNOWN_ACTIONS, ALL_KNOWN_MODULES);
    intendedAction = intendedAction ?? intent.action;
    targetModule = targetModule ?? intent.module;
  }

  if (!intendedAction || !targetModule) {
    intendedAction = intendedAction ?? 'unknown';
    targetModule = targetModule ?? 'unknown';
  }

  const decision = evaluatePolicy(userId, role, intendedAction, targetModule);
  await logDecision(decision, payload.query, userId);

  if (!decision.allowed) {
    res.status(403).json(
      errorResponse(decision.reason ?? 'Access denied by policy engine', 403)
    );
    return;
  }

  let aiResponse = 'Action permitted by ArmorIQ policy. Downstream execution scaffold is ready.';

  if (gemini) {
    aiResponse = await gemini.answerQuestion(
      payload.query,
      `Allowed action=${intendedAction}; target module=${targetModule}; role=${role}`
    );
  }

  res.json(
    successResponse(
      {
        policyDecision: decision,
        response: aiResponse,
      },
      'Query accepted by ArmorIQ'
    )
  );
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
  const logs = await AIAuditLog.find().sort({ createdAt: -1 }).limit(limit).lean();

  res.json(successResponse(logs, 'Audit logs fetched'));
}

export async function getCapabilities(req: Request, res: Response): Promise<void> {
  const role = req.user?.role ?? 'citizen';
  const policy = POLICIES[role];

  if (!policy) {
    res.status(403).json(errorResponse(`Unknown role '${role}'`, 403));
    return;
  }

  res.json(
    successResponse(
      {
        role,
        allowedActions: policy.allowedActions,
        allowedModules: policy.allowedModules,
      },
      'Role capabilities fetched'
    )
  );
}

export async function transcribeVoice(req: Request, res: Response): Promise<void> {
  const body = req.body as { transcript?: string; audioUrl?: string; language?: string };

  const transcript = body.transcript?.trim() ||
    (body.audioUrl ? `Transcription placeholder for: ${body.audioUrl}` : '');

  if (!transcript) {
    res.status(400).json(errorResponse('Provide transcript or audioUrl', 400));
    return;
  }

  res.json(
    successResponse(
      {
        transcript,
        language: body.language ?? 'en',
      },
      'Voice transcribed'
    )
  );
}
