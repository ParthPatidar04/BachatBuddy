import mongoose from 'mongoose';
import { FREQUENCIES } from '../utils/constants.js';

const recurringSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0.01 },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    account: { type: String, trim: true, maxlength: 40, default: 'Cash' },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    nextDate: { type: Date, required: true }, // next occurrence that has NOT been generated yet
    anchorDay: { type: Number, required: true }, // day of month the rule started on
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    lastGeneratedAt: { type: Date },
  },
  { timestamps: true }
);

recurringSchema.index({ user: 1, nextDate: 1 });
recurringSchema.index({ isActive: 1, nextDate: 1 }); // used by the background job

export default mongoose.model('Recurring', recurringSchema);