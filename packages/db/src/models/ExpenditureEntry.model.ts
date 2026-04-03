import mongoose, { Schema, Document } from 'mongoose';
import { IExpenditureEntry } from '@nexus-civic/shared-types';

export interface IExpenditureEntryDocument extends Omit<IExpenditureEntry, '_id' | 'createdAt'>, Document {
  createdAt: Date;
}

const ExpenditureEntrySchema = new Schema<IExpenditureEntryDocument>(
  {
    officerId: { type: String, required: true },
    department: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    solanaSignature: { type: String, required: true },
    explorerUrl: { type: String, required: true },
    isMockSignature: { type: Boolean, required: true },
  },
  {
    timestamps: true,
  }
);

ExpenditureEntrySchema.index({ department: 1, createdAt: 1 });

/**
 * ExpenditureEntry Model (used by LedgerCivic)
 */
export const ExpenditureEntry = mongoose.models.ExpenditureEntry || mongoose.model<IExpenditureEntryDocument>('ExpenditureEntry', ExpenditureEntrySchema);
