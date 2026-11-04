import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    targetAmount: { type: Number, required: true, min: 0.01 },
    savedAmount: { type: Number, default: 0, min: 0 },
    targetDate: { type: Date, required: true },
    contributions: [
      {
        _id: false,
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Goal', goalSchema);