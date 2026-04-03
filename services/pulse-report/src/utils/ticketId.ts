import { Counter } from '@nexus-civic/db';

function formatDatePart(date: Date): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Generate ticket IDs in GRV-YYYYMMDD-XXXX format.
 */
export async function generateTicketId(): Promise<string> {
  const now = new Date();
  const datePart = formatDatePart(now);
  const counterKey = `grievance:${datePart}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const serial = String(counter.seq).padStart(4, '0');
  return `GRV-${datePart}-${serial}`;
}
