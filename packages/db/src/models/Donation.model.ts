import mongoose, { Schema, Document } from 'mongoose';
import { IDonation } from '@nexus-civic/shared-types';

export interface IDonationDocument extends Omit<IDonation, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const DonationSchema = new Schema<IDonationDocument>(
  {
    donorId: { type: String, required: true },
    itemName: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    photoUrls: { type: [String], required: true },
    qualityScore: { type: Number, required: true },
    qualityAccepted: { type: Boolean, required: true },
    matchedNgoId: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'QUALITY_CHECK', 'MATCHED', 'COLLECTED', 'DELIVERED', 'REJECTED'],
      required: true,
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

DonationSchema.index({ 'location.lng': '2dsphere', 'location.lat': '2dsphere' });

/**
 * Donation Model (used by NearGive)
 */
export const Donation = mongoose.models.Donation || mongoose.model<IDonationDocument>('Donation', DonationSchema);
