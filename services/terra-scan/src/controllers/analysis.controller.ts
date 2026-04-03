import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { EnvironmentalAlert } from '@nexus-civic/db';
import { createGeminiClient } from '@nexus-civic/gemini-client';
import { fetchNDVI, fetchLST, fetchFloodExtent, fetchFireHotspots, fetchAQI } from '../utils/gee';

const Severity = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 5,
} as const;

// In-memory store for Background Analysis Jobs
interface AnalysisJob {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  alertId?: string;
  error?: string;
}

const analysisJobs = new Map<string, AnalysisJob>();
const gemini = createGeminiClient(process.env.GEMINI_API_KEY || '');

function parseGeminiJsonReport(raw: string) {
  const fallback = {
    severityByType: { flood: 'LOW', fire: 'LOW', airQuality: 'LOW' },
    probableCauses: ['Unknown due to model parsing fallback'],
    recommendedActions: ['Continue monitoring'],
    urgentAlerts: [] as string[],
  };

  try {
    const trimmed = raw.trim();
    const fenced = trimmed.startsWith('```')
      ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      : trimmed;
    const start = fenced.indexOf('{');
    const end = fenced.lastIndexOf('}');
    const jsonText = start >= 0 && end > start ? fenced.slice(start, end + 1) : fenced;
    const parsed = JSON.parse(jsonText);
    return {
      severityByType: parsed.severityByType || fallback.severityByType,
      probableCauses: Array.isArray(parsed.probableCauses) ? parsed.probableCauses : fallback.probableCauses,
      recommendedActions: Array.isArray(parsed.recommendedActions)
        ? parsed.recommendedActions
        : fallback.recommendedActions,
      urgentAlerts: Array.isArray(parsed.urgentAlerts) ? parsed.urgentAlerts : fallback.urgentAlerts,
    };
  } catch {
    return fallback;
  }
}

export const triggerAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { regionPolygon, regionName } = req.body;
    
    if (!regionPolygon) {
      res.status(400).json({ error: 'regionPolygon is required' });
      return;
    }

    const jobId = uuidv4();
    const job: AnalysisJob = {
      id: jobId,
      status: 'PENDING',
      createdAt: new Date(),
    };
    analysisJobs.set(jobId, job);

    res.status(202).json({ jobId, status: 'PENDING', message: 'Analysis triggered successfully' });

    // Background job processing
    setImmediate(async () => {
      try {
        console.log(`[Job ${jobId}] Starting GEE data collection for ${regionName || 'Custom Region'}`);
        // 1. Fetch 5 layers
        const [ndviScore, lstCelsius, floodExtentPercent, fireHotspots, aqiProxy] = await Promise.all([
          fetchNDVI(regionPolygon),
          fetchLST(regionPolygon),
          fetchFloodExtent(regionPolygon),
          fetchFireHotspots(regionPolygon),
          fetchAQI(regionPolygon),
        ]);

        console.log(`[Job ${jobId}] Data fetched. Requesting Gemini analysis...`);

        // 2. Ask Gemini for structured JSON report.
        const reportPrompt =
          'Analyze environmental telemetry and return strict JSON only with keys: ' +
          'severityByType, probableCauses, recommendedActions, urgentAlerts, overallSeverity. ' +
          'overallSeverity must be LOW|MEDIUM|HIGH|CRITICAL.';
        const compositeData = {
          region: regionName || 'Unknown Region',
          ndviScore,
          lstCelsius,
          floodExtentPercent,
          fireHotspots,
          aqiProxy,
        };
        const reportRaw = await gemini.generateReport(reportPrompt, compositeData);
        const reportObj = parseGeminiJsonReport(reportRaw);

        const severityCandidates = [
          reportObj.severityByType?.flood,
          reportObj.severityByType?.fire,
          reportObj.severityByType?.airQuality,
        ]
          .map((value: string | undefined) => (value || 'LOW').toUpperCase())
          .concat(reportObj.urgentAlerts.length > 0 ? ['HIGH'] : []);
        const overallSeverity = severityCandidates.includes('CRITICAL')
          ? Severity.CRITICAL
          : severityCandidates.includes('HIGH')
            ? Severity.HIGH
            : severityCandidates.includes('MEDIUM')
              ? Severity.MEDIUM
              : Severity.LOW;

        // 3. Save EnvironmentalAlert
        console.log(`[Job ${jobId}] Saving EnvironmentalAlert...`);
        const alert = new EnvironmentalAlert({
          regionPolygon,
          regionName: regionName || 'Custom Region',
          ndviScore,
          lstCelsius,
          floodExtentPercent,
          fireHotspots,
          aqiProxy,
          overallSeverity,
          geminiReport: JSON.stringify(reportObj),
          probableCauses: reportObj.probableCauses || [],
          recommendedActions: reportObj.recommendedActions || [],
        });

        await alert.save();

        // 4. Update Job Status
        const j = analysisJobs.get(jobId);
        if (j) {
          j.status = 'COMPLETED';
          j.alertId = alert._id.toString();
        }
        console.log(`[Job ${jobId}] Completed successfully. Alert ID: ${alert._id}`);

      } catch (err) {
        console.error(`[Job ${jobId}] Failed during background execution`, err);
        const j = analysisJobs.get(jobId);
        if (j) {
          j.status = 'FAILED';
          j.error = err instanceof Error ? err.message : String(err);
        }
      }
    });

  } catch (error) {
    console.error('triggerAnalysis error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAnalysis = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  const job = analysisJobs.get(jobId);
  
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  
  res.json(job);
};

export const getAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const alerts = await EnvironmentalAlert.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await EnvironmentalAlert.countDocuments();

    res.json({
      alerts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const alert = await EnvironmentalAlert.findById(id);
    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
