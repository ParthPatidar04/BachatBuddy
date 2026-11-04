import Notification from '../models/Notification.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { refreshNotifications } from '../services/notificationService.js';
import { processRecurringForUser } from '../services/recurringService.js';

const visible = (userId) => ({ user: userId, dismissed: false });

export const listNotifications = asyncHandler(async (req, res) => {
  await processRecurringForUser(req.user);
  await refreshNotifications(req.user);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find(visible(req.user._id)).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ ...visible(req.user._id), read: false }),
  ]);
  res.json({ notifications, unreadCount });
});

export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) throw new AppError('Notification not found', 404);
  res.json({ notification: n });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ ...visible(req.user._id), read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { dismissed: true, read: true });
  if (!n) throw new AppError('Notification not found', 404);
  res.json({ message: 'Notification removed' });
});

export const clearNotifications = asyncHandler(async (req, res) => {
  await Notification.updateMany(visible(req.user._id), { dismissed: true, read: true });
  res.json({ message: 'Notifications cleared' });
});