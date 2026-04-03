import mongoose, { Schema, Document } from 'mongoose';
import { ICrimePrediction } from '@nexus-civic/shared-types';

export interface ICrimePredictionDocument extends Omit<ICrimePrediction, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const CrimePredictionSchema = new Schema<ICrimePredictionDocument>(
  {
    s2CellId: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    riskScore: { type: Number, required: true },
    timeSlot: { type: String, required: true },
    reasoning: { type: String, required: true },
    dispatchTriggered: { type: Boolean, required: true },
    dispatchRunId: { type: String },
  },
  {
    timestamps: true,
  }
);

CrimePredictionSchema.index({ s2CellId: 1, createdAt: 1 });

/**
 * CrimePrediction Model (used by SentinelAI)
 */
export const CrimePrediction = mongoose.models.CrimePrediction || mongoose.model<ICrimePredictionDocument>('CrimePrediction', CrimePredictionSchema);
