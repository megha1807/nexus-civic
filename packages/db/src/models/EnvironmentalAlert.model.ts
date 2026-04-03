import mongoose, { Schema, Document } from 'mongoose';
import { IEnvironmentalAlert, Severity } from '@nexus-civic/shared-types';

export interface IEnvironmentalAlertDocument extends Omit<IEnvironmentalAlert, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const EnvironmentalAlertSchema = new Schema<IEnvironmentalAlertDocument>(
  {
    regionPolygon: { type: Object, required: true },
    regionName: { type: String },
    ndviScore: { type: Number },
    lstCelsius: { type: Number },
    floodExtentPercent: { type: Number },
    fireHotspots: { type: Number },
    aqiProxy: { type: Number },
    overallSeverity: { type: Number, enum: Object.values(Severity), required: true },
    geminiReport: { type: String, required: true },
    probableCauses: { type: [String], required: true },
    recommendedActions: { type: [String], required: true },
  },
  {
    timestamps: true,
  }
);

EnvironmentalAlertSchema.index({ createdAt: 1 });

/**
 * EnvironmentalAlert Model (used by TerraScan)
 */
export const EnvironmentalAlert = mongoose.models.EnvironmentalAlert || mongoose.model<IEnvironmentalAlertDocument>('EnvironmentalAlert', EnvironmentalAlertSchema);
