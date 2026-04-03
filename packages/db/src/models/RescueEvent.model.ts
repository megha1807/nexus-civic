import mongoose, { Schema, Document } from 'mongoose';
import { IRescueEvent } from '@nexus-civic/shared-types';

export interface IRescueEventDocument extends Omit<IRescueEvent, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const RescueEventSchema = new Schema<IRescueEventDocument>(
  {
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    type: { type: String, required: true },
    description: { type: String },
    reportedBy: { type: String, required: true },
    meshNodes: { type: [String], required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'CONTAINED', 'RESOLVED'],
      required: true,
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

RescueEventSchema.index({ 'location.lng': '2dsphere', 'location.lat': '2dsphere' });

/**
 * RescueEvent Model (used by MeshAlert)
 */
export const RescueEvent = mongoose.models.RescueEvent || mongoose.model<IRescueEventDocument>('RescueEvent', RescueEventSchema);
