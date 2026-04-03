import type { Request, Response } from 'express';
import { Grievance } from '@nexus-civic/db';

import { DEPARTMENT_ROUTING } from '../config/departments';
import { successResponse } from '../utils/response';

function getSlaHoursForRecord(priority: string, category: string): number {
  const department = DEPARTMENT_ROUTING[category] ?? DEPARTMENT_ROUTING.other;

  switch (priority) {
    case 'CRITICAL':
      return department.slaHours.critical;
    case 'HIGH':
      return department.slaHours.high;
    case 'LOW':
      return department.slaHours.low;
    case 'MEDIUM':
    default:
      return department.slaHours.medium;
  }
}

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getAnalyticsSummary(_req: Request, res: Response): Promise<void> {
  const [statusSummary, categorySummary, total] = await Promise.all([
    Grievance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Grievance.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Grievance.countDocuments({}),
  ]);

  res.json(
    successResponse({
      total,
      byStatus: statusSummary,
      byCategory: categorySummary,
    })
  );
}

export async function getAnalyticsTrends(_req: Request, res: Response): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = (await Grievance.aggregate([
    { $match: { createdAt: { $gte: cutoff } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])) as Array<{ _id: string; count: number }>;

  res.json(successResponse(rows, '30-day grievance trends'));
}

export async function getAnalyticsSla(_req: Request, res: Response): Promise<void> {
  const grievances = await Grievance.find({}).select({
    category: 1,
    priority: 1,
    status: 1,
    createdAt: 1,
    statusHistory: 1,
  });

  const now = Date.now();
  const result = grievances.map((row) => {
    const slaHours = getSlaHoursForRecord(row.priority, row.category);
    const dueAt = new Date(row.createdAt.getTime() + slaHours * 60 * 60 * 1000);

    const resolvedEntry = row.statusHistory
      ?.slice()
      .reverse()
      .find((entry: { status: string; timestamp: Date }) =>
        entry.status === 'RESOLVED' || entry.status === 'CLOSED'
      );

    const effectiveEnd = resolvedEntry?.timestamp?.getTime() ?? now;
    const breached = effectiveEnd > dueAt.getTime();

    return {
      grievanceId: String(row._id),
      category: row.category,
      priority: row.priority,
      status: row.status,
      slaHours,
      dueAt,
      breached,
      dateKey: toDateKey(row.createdAt),
    };
  });

  const summary = {
    total: result.length,
    breached: result.filter((item) => item.breached).length,
    withinSla: result.filter((item) => !item.breached).length,
  };

  res.json(successResponse({ summary, records: result }));
}
