import mongoose, { Schema, Document } from 'mongoose';
import { ISOSEvent, Severity } from '@nexus-civic/shared-types';

export interface ISOSEventDocument extends Omit<ISOSEvent, '_id' | 'createdAt' | 'resolvedAt'>, Document {
  createdAt: Date;
  resolvedAt?: Date;
}

const SOSEventSchema = new Schema<ISOSEventDocument>(
  {
    type: { type: String, enum: ['hardware', 'voice', 'tap'], required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    userId: { type: String, required: true },
    deviceId: { type: String },
    severity: { type: Number, enum: Object.values(Severity), required: true },
    status: { type: String, enum: ['ACTIVE', 'RESPONDING', 'RESOLVED'], required: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
    superplaneRunId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Add 2dsphere index on location for geospatial queries
SOSEventSchema.index({ 'location.lng': '2dsphere', 'location.lat': '2dsphere' });

/**
 * Static method to find nearby SOS events
 */
SOSEventSchema.statics.findNearby = function(lat: number, lng: number, radiusKm: number) {
  return this.find({
    location: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radiusKm / 6378.1]
      }
    }
  });
};

SOSEventSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'RESOLVED' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

export interface ISOSEventModel extends mongoose.Model<ISOSEventDocument> {
  findNearby(lat: number, lng: number, radiusKm: number): Promise<ISOSEventDocument[]>;
}

/**
 * SOSEvent Model (used by GuardianNet)
 */
export const SOSEvent = mongoose.models.SOSEvent || mongoose.model<ISOSEventDocument, ISOSEventModel>('SOSEvent', SOSEventSchema);
