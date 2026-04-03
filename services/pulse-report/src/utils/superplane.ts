import axios from 'axios';

import { createLogger } from './logger';

const logger = createLogger(process.env.SERVICE_NAME ?? 'pulse-report');

export async function triggerGrievancePipeline(grievance: unknown): Promise<string | null> {
  const apiKey = process.env.SUPERPLANE_API_KEY;
  if (!apiKey) {
    logger.warn('SUPERPLANE_API_KEY is not set; skipping grievance pipeline trigger.');
    return null;
  }

  const baseUrl = process.env.SUPERPLANE_API_URL ?? 'https://api.superplane.ai/v1';

  try {
    const response = await axios.post(
      `${baseUrl}/runs`,
      {
        workflow: 'grievance-routing',
        event: grievance,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const runId = response.data?.runId;
    return typeof runId === 'string' ? runId : null;
  } catch (error) {
    logger.error('Failed to trigger Superplane grievance pipeline.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function updateWorkflowStatus(
  runId: string,
  status: string,
  notes?: string
): Promise<void> {
  const apiKey = process.env.SUPERPLANE_API_KEY;
  if (!apiKey) {
    logger.warn('SUPERPLANE_API_KEY is not set; skipping workflow status update.', { runId, status });
    return;
  }

  const baseUrl = process.env.SUPERPLANE_API_URL ?? 'https://api.superplane.ai/v1';

  try {
    await axios.patch(
      `${baseUrl}/runs/${encodeURIComponent(runId)}`,
      {
        status,
        notes,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
  } catch (error) {
    logger.warn('Failed to update Superplane workflow status.', {
      runId,
      status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
