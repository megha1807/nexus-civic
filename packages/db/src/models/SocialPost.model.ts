import mongoose, { Schema, Document } from 'mongoose';
import { ISocialPost } from '@nexus-civic/shared-types';

export interface ISocialPostDocument extends Omit<ISocialPost, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const SocialPostSchema = new Schema<ISocialPostDocument>(
  {
    text: { type: String, required: true },
    authorId: { type: String, required: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    category: { type: String },
    sentimentScore: { type: Number, required: true },
    urgencyScore: { type: Number, required: true, default: 0 },
    factCheck: {
      verdict: { type: String, enum: ['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIABLE'] },
      explanation: { type: String },
      confidence: { type: Number },
      sources: { type: [String] },
      checkedAt: { type: Date },
    },
    crisisClusterId: { type: String },
    voteCount: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

SocialPostSchema.index({ text: 'text' });

/**
 * SocialPost Model (used by CivicPulse)
 */
export const SocialPost = mongoose.models.SocialPost || mongoose.model<ISocialPostDocument>('SocialPost', SocialPostSchema);
