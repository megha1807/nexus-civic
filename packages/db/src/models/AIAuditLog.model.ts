import mongoose, { Schema, Document } from 'mongoose';
import { IAIAuditLog } from '@nexus-civic/shared-types';

export interface IAIAuditLogDocument extends Omit<IAIAuditLog, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const AIAuditLogSchema = new Schema<IAIAuditLogDocument>(
  {
    userId: { type: String, required: true },
    query: { type: String, required: true },
    action: { type: String, required: true },
    module: { type: String, required: true },
    role: { type: String, required: true },
    allowed: { type: Boolean, required: true },
    blockReason: { type: String },
    reason: { type: String },
  },
  {
    timestamps: true,
  }
);

AIAuditLogSchema.index({ userId: 1, createdAt: 1 });
AIAuditLogSchema.index({ allowed: 1, createdAt: 1 });

/**
 * AIAuditLog Model (used by AuraAssist / SentinelAI)
 */
export const AIAuditLog = mongoose.models.AIAuditLog || mongoose.model<IAIAuditLogDocument>('AIAuditLog', AIAuditLogSchema);
