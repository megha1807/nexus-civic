import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '@nexus-civic/shared-types';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  fcmTokens: string[];
  location?: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CITIZEN,
      required: true,
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

/**
 * Common User Model
 */
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
