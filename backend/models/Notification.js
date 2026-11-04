import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // `key` makes every notification idempotent: the same event never notifies twice,
    // even after the user dismisses it (dismissed notifications are hidden, not deleted).
    key: { type: String, required: true },
    type: {
      type: String,
      enum: ['budget_warning', 'budget_exceeded', 'bill_due', 'bill_overdue', 'recurring', 'goal_milestone'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, key: 1 }, { unique: true });
notificationSchema.index({ user: 1, dismissed: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // auto-clean after 90 days

export default mongoose.model('Notification', notificationSchema);