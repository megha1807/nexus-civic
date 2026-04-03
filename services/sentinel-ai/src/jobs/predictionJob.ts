import axios from 'axios';
import { createGeminiClient } from '@nexus-civic/gemini-client';
import { CrimePrediction } from '@nexus-civic/db';
import { triggerPatrolDispatch } from '../utils/superplane';

let nodeS2: any;
try {
  nodeS2 = require('node-s2');
} catch (e) {
  console.warn('[node-s2] Failed to load node-s2, trying fallback adapter', e);
  try {
    nodeS2 = require('s2-geometry').S2;
  } catch (fallbackError) {
    console.warn('[node-s2] Fallback S2 adapter unavailable', fallbackError);
  }
}

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

async function callService<T>(url: string): Promise<T | null> {
  try {
    const response = await axios.get<T>(url, { timeout: 3000 });
    return response.data;
  } catch (error) {
    console.error(`[PredictionJob] callService failed for ${url}:`, error);
    return null;
  }
}

function normalizeIncidents(payload: any, kind: 'SOS' | 'Grievance', since: Date) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.alerts)
        ? payload.alerts
        : [];

  return rows
    .map((row: any) => ({ ...row, type: kind }))
    .filter((row: any) => {
      const createdAt = new Date(row.createdAt || row.timestamp || 0);
      return (
        Number.isFinite(createdAt.getTime()) &&
        createdAt >= since &&
        row?.location &&
        typeof row.location.lat === 'number' &&
        typeof row.location.lng === 'number'
      );
    });
}

function resolveS2Cell(lat: number, lng: number): { token: string; centerLat: number; centerLng: number } {
  if (nodeS2?.latLngToKey && nodeS2?.keyToLatLng) {
    const key = nodeS2.latLngToKey(lat, lng, 14);
    const center = nodeS2.keyToLatLng(key);
    return { token: key, centerLat: center.lat, centerLng: center.lng };
  }

  if (nodeS2?.latLngToKey && nodeS2?.S2?.keyToLatLng) {
    const key = nodeS2.latLngToKey(lat, lng, 14);
    const center = nodeS2.S2.keyToLatLng(key);
    return { token: key, centerLat: center.lat, centerLng: center.lng };
  }

  const coarseToken = `fixed-${lat.toFixed(2)}-${lng.toFixed(2)}`;
  return { token: coarseToken, centerLat: lat, centerLng: lng };
}

export const runPredictionCycle = async () => {
  console.log('[PredictionJob] Starting prediction cycle...');

  try {
    const since = new Date(Date.now() - DAYS_30_MS);

    // 1. Fetch last-30-days SOS events from GuardianNet.
    const sosPayload = await callService<any>('http://guardian-net:3001/api/sos/events?limit=500');

    // 2. Fetch public-safety grievances from PulseReport.
    const grievancesPayload = await callService<any>(
      'http://pulse-report:3002/api/grievances?category=public-safety&limit=500'
    );

    const incidents = [
      ...normalizeIncidents(sosPayload, 'SOS', since),
      ...normalizeIncidents(grievancesPayload, 'Grievance', since),
    ];

    // 3. Group by S2 cell
    const cellGroups = new Map<string, { incidents: any[]; lat: number; lng: number }>();

    for (const inc of incidents) {
      try {
        const lat = inc.location.lat;
        const lng = inc.location.lng;
        const cell = resolveS2Cell(lat, lng);
        const cellToken = cell.token;

        if (!cellGroups.has(cellToken)) {
          cellGroups.set(cellToken, { incidents: [], lat: cell.centerLat, lng: cell.centerLng });
        }
        cellGroups.get(cellToken)!.incidents.push(inc);
      } catch (err) {
        console.warn('Failed grouping for incident', err);
      }
    }

    console.log(`[PredictionJob] Grouped into ${cellGroups.size} cells.`);

    // 4. For cells with 2+ incidents, call Gemini prediction.
    const apiKey = process.env.GEMINI_API_KEY || 'dummy_key';
    const gemini = createGeminiClient(apiKey);
    
    // Time slot (e.g., 'Night', 'Morning', 'Afternoon')
    const hour = new Date().getHours();
    const timeSlot = hour < 6 ? 'Night' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    
    for (const [cellToken, groupData] of cellGroups.entries()) {
      if (groupData.incidents.length >= 2) {
        console.log(`[PredictionJob] Analyzing cell ${cellToken} with ${groupData.incidents.length} incidents`);
        
        try {
          const predictionRes = await gemini.predictCrimeRisk(
            { lat: groupData.lat, lng: groupData.lng },
            timeSlot,
            groupData.incidents.map(i => ({ type: i.type, timestamp: i.createdAt, description: i.description || i.reason }))
          );

          // 5. Save prediction
          const prediction = new CrimePrediction({
            s2CellId: cellToken,
            location: {
              lat: groupData.lat,
              lng: groupData.lng,
              s2CellId: cellToken
            },
            riskScore: predictionRes.riskScore,
            timeSlot,
            reasoning: predictionRes.reasoning,
            dispatchTriggered: false
          });

          await prediction.save();

          console.log(`[PredictionJob] Saved prediction for ${cellToken}. Risk: ${predictionRes.riskScore}`);

          // Trigger dispatch if risk >= 7
          if (predictionRes.riskScore >= 7) {
            console.log(`[PredictionJob] High risk detected (${predictionRes.riskScore}). Triggering dispatch...`);
            const runId = await triggerPatrolDispatch(prediction);
            if (runId) {
              prediction.dispatchTriggered = true;
              prediction.dispatchRunId = runId;
              await prediction.save();
            }
          }
        } catch (err) {
          console.error(`[PredictionJob] Gemini prediction error for cell ${cellToken}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('[PredictionJob] Global Error in prediction cycle:', error);
  }
};
