import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0.01 },
    dueDate: { type: Date, required: true },
    category: { type: String, trim: true, maxlength: 40, default: 'Bills & Utilities' },
    account: { type: String, trim: true, maxlength: 40, default: 'Cash' },
    reminderDays: { type: Number, min: 0, max: 30, default: 3 },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidAt: { type: Date },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true }
);

billSchema.index({ user: 1, status: 1, dueDate: 1 });

export default mongoose.model('Bill', billSchema);