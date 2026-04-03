import mongoose, { Schema, Document } from 'mongoose';
import { IMeshNode } from '@nexus-civic/shared-types';

export interface IMeshNodeDocument extends Omit<IMeshNode, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const MeshNodeSchema = new Schema<IMeshNodeDocument>(
  {
    deviceId: { type: String, required: true, unique: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    batteryLevel: { type: Number },
    meshCapabilities: { type: [String], required: true },
    lastSeen: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

MeshNodeSchema.index({ 'location.lng': '2dsphere', 'location.lat': '2dsphere' });
MeshNodeSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 3600 });

/**
 * MeshNode Model (used by MeshAlert)
 */
export const MeshNode = mongoose.models.MeshNode || mongoose.model<IMeshNodeDocument>('MeshNode', MeshNodeSchema);
