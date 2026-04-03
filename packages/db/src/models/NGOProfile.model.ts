import mongoose, { Schema, Document } from 'mongoose';
import { INGOProfile } from '@nexus-civic/shared-types';

export interface INGOProfileDocument extends Omit<INGOProfile, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const NGOProfileSchema = new Schema<INGOProfileDocument>(
  {
    name: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    acceptedCategories: { type: [String], required: true },
    maxCapacity: { type: Number, required: true },
    currentLoad: { type: Number, required: true, default: 0 },
    rating: { type: Number, required: true, default: 0 },
    verified: { type: Boolean, required: true, default: false },
    contactEmail: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

NGOProfileSchema.index({ 'location.lng': '2dsphere', 'location.lat': '2dsphere' });

NGOProfileSchema.statics.findNearbyWithCapacity = function(lat: number, lng: number, radiusKm: number, category: string) {
  return this.find({
    location: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radiusKm / 6378.1]
      }
    },
    acceptedCategories: category,
    $expr: { $lt: ['$currentLoad', '$maxCapacity'] }
  });
};

export interface INGOProfileModel extends mongoose.Model<INGOProfileDocument> {
  findNearbyWithCapacity(lat: number, lng: number, radiusKm: number, category: string): Promise<INGOProfileDocument[]>;
}

/**
 * NGOProfile Model (used by NearGive)
 */
export const NGOProfile = mongoose.models.NGOProfile || mongoose.model<INGOProfileDocument, INGOProfileModel>('NGOProfile', NGOProfileSchema);
