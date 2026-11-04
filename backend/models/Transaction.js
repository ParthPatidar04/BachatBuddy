import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0.01 },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    date: { type: Date, required: true },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    account: { type: String, trim: true, maxlength: 40, default: 'Cash' },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recurring' },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
  },
  { timestamps: true }
);

// Every query is scoped by user first; these cover list/sort, type filter and category filter
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });

transactionSchema.set('toJSON', {
  transform: (_d, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Transaction', transactionSchema);