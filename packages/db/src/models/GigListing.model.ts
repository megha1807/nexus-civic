import mongoose, { Schema, Document } from 'mongoose';
import { IGigListing } from '@nexus-civic/shared-types';

export interface IGigListingDocument extends Omit<IGigListing, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const GigListingSchema = new Schema<IGigListingDocument>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    requiredSkills: { type: [String], required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    budget: { type: Number, required: true },
    employerId: { type: String, required: true },
    fraudScore: { type: Number, required: true, default: 0 },
    fraudFlags: { type: [String] },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'ACTIVE', 'FILLED', 'REJECTED'],
      required: true,
      default: 'PENDING_REVIEW',
    },
  },
  {
    timestamps: true,
  }
);

GigListingSchema.index({ 'location.lng': '2dsphere', 'location.lat': '2dsphere' });

/**
 * GigListing Model (used by GigForge)
 */
export const GigListing = mongoose.models.GigListing || mongoose.model<IGigListingDocument>('GigListing', GigListingSchema);
