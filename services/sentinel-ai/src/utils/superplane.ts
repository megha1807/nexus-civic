import axios from 'axios';

type DispatchPrediction = {
  _id?: { toString(): string } | string;
  s2CellId: string;
  riskScore: number;
  location: { lat: number; lng: number; accuracy?: number; address?: string; s2CellId?: string };
  reasoning: string;
  timeSlot: string;
};

export const triggerPatrolDispatch = async (prediction: DispatchPrediction): Promise<string | null> => {
  try {
    const superplaneUrl = process.env.SUPERPLANE_API_URL || 'https://api.superplane.ai/webhook/trigger';
    const apiKey = process.env.SUPERPLANE_API_KEY; // if needed, could be optional based on user's env

    const payload = {
      workflow: 'sentinel-dispatch',
      data: {
        predictionId: prediction._id?.toString(),
        s2CellId: prediction.s2CellId,
        riskScore: prediction.riskScore,
        location: prediction.location,
        reasoning: prediction.reasoning,
        timeSlot: prediction.timeSlot
      }
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await axios.post(superplaneUrl, payload, { headers });

    // Assuming Superplane returns a runId. We extract it.
    if (response.data && response.data.runId) {
      return response.data.runId;
    }
    
    // Fallback or debug
    console.log(`[Superplane] Triggered patrol dispatch for prediction, received:`, response.data);
    return response.data?.id || 'mock-run-id';
  } catch (error) {
    console.error(`[Superplane Error] Failed to trigger patrol dispatch:`, error);
    return null;
  }
};
