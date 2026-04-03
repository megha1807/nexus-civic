import { Request, Response } from 'express';
import { CrimePrediction } from '@nexus-civic/db';
import { triggerPatrolDispatch } from '../utils/superplane';

const acknowledgedDispatches = new Set<string>();

export const getHeatmap = async (req: Request, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const predictions = await CrimePrediction.find({ createdAt: { $gte: twentyFourHoursAgo } });

    // Format as GeoJSON FeatureCollection
    const featureCollection = {
      type: 'FeatureCollection',
      features: predictions.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.location.lng, p.location.lat],
        },
        properties: {
          _id: p._id,
          riskScore: p.riskScore,
          s2CellId: p.s2CellId,
          reasoning: p.reasoning,
          timeSlot: p.timeSlot,
        },
      })),
    };

    res.status(200).json(featureCollection);
  } catch (error) {
    console.error('[getHeatmap] Error:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
};

export const getTopZones = async (req: Request, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const predictions = await CrimePrediction.find({ createdAt: { $gte: twentyFourHoursAgo } })
      .sort({ riskScore: -1 })
      .limit(5);
    res.status(200).json(predictions);
  } catch (error) {
    console.error('[getTopZones] Error:', error);
    res.status(500).json({ error: 'Failed to fetch top zones' });
  }
};

export const triggerDispatch = async (req: Request, res: Response) => {
  try {
    const { predictionId } = req.body;
    if (!predictionId) {
      return res.status(400).json({ error: 'predictionId is required' });
    }

    const prediction = await CrimePrediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    const runId = await triggerPatrolDispatch(prediction);
    if (runId) {
      prediction.dispatchTriggered = true;
      prediction.dispatchRunId = runId;
      await prediction.save();
      res.status(200).json({ message: 'Dispatch triggered successfully', runId, prediction });
    } else {
      res.status(500).json({ error: 'Failed to trigger dispatch via Superplane' });
    }
  } catch (error) {
    console.error('[triggerDispatch] Error:', error);
    res.status(500).json({ error: 'Internal server error while triggering dispatch' });
  }
};

export const getActiveDispatches = async (req: Request, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeDispatches = await CrimePrediction.find({
      dispatchTriggered: true,
      createdAt: { $gte: twentyFourHoursAgo },
    });

    const activeOnly = activeDispatches.filter(
      (prediction) => !acknowledgedDispatches.has(String(prediction._id))
    );
    res.status(200).json(activeOnly);
  } catch (error) {
    console.error('[getActiveDispatches] Error:', error);
    res.status(500).json({ error: 'Failed to fetch active dispatches' });
  }
};

export const acknowledgeDispatch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prediction = await CrimePrediction.findById(id);
    if (!prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    acknowledgedDispatches.add(id);
    res.status(200).json({ message: 'Dispatch acknowledged successfully', predictionId: id });
  } catch (error) {
    console.error('[acknowledgeDispatch] Error:', error);
    res.status(500).json({ error: 'Failed to acknowledge dispatch' });
  }
};
