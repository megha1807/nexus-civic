import mongoose, { Schema, Document } from 'mongoose';
import { IWorkerProfile } from '@nexus-civic/shared-types';

export interface IWorkerProfileDocument extends Omit<IWorkerProfile, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const WorkerProfileSchema = new Schema<IWorkerProfileDocument>(
  {
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    skills: { type: [String], required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number },
      address: { type: String },
      s2CellId: { type: String },
    },
    bio: { type: String },
    rating: { type: Number, required: true, default: 0 },
    completedGigs: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

WorkerProfileSchema.index({ 'location.lng': '2dsphere', 'location.lat': '2dsphere' });

WorkerProfileSchema.pre('save', function (next) {
  if (this.isModified('skills') && this.skills) {
    this.skills = this.skills.map((skill) => skill.toLowerCase().trim());
  }
  next();
});

/**
 * WorkerProfile Model (used by GigForge)
 */
export const WorkerProfile = mongoose.models.WorkerProfile || mongoose.model<IWorkerProfileDocument>('WorkerProfile', WorkerProfileSchema);
