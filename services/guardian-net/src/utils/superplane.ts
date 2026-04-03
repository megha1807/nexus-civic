import axios from 'axios';

import { createLogger } from './logger';

const logger = createLogger(process.env.SERVICE_NAME ?? 'guardian-net');

export async function triggerPoliceEscalation(event: unknown): Promise<string | null> {
  const apiKey = process.env.SUPERPLANE_API_KEY;
  if (!apiKey) {
    logger.warn('SUPERPLANE_API_KEY is not set; skipping police escalation.');
    return null;
  }

  const baseUrl = process.env.SUPERPLANE_API_URL ?? 'https://api.superplane.ai/v1';

  try {
    const response = await axios.post(
      `${baseUrl}/runs`,
      { event },
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
    logger.error('Failed to trigger Superplane escalation.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
