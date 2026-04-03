import mongoose, { Schema, Document } from 'mongoose';
import { ITownHallSession, ITownHallIssue } from '@nexus-civic/shared-types';

export interface ITownHallSessionDocument extends Omit<ITownHallSession, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const TownHallIssueSchema = new Schema<ITownHallIssue>(
  {
    text: { type: String, required: true },
    authorId: { type: String, required: true },
    voteCount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], required: true, default: 'OPEN' },
  },
  { _id: true }
);

const TownHallSessionSchema = new Schema<ITownHallSessionDocument>(
  {
    title: { type: String, required: true },
    adminId: { type: String, required: true },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'CLOSED'],
      required: true,
      default: 'UPCOMING',
    },
    scheduledAt: { type: Date, required: true },
    spacetimeRoomId: { type: String },
    issues: { type: [TownHallIssueSchema], default: [] },
    participantCount: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

/**
 * TownHallSession Model (used by VoiceAssembly)
 */
export const TownHallSession = mongoose.models.TownHallSession || mongoose.model<ITownHallSessionDocument>('TownHallSession', TownHallSessionSchema);
