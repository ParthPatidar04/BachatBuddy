import Recurring from '../models/Recurring.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { addInterval, DAY, startOfDayUTC } from '../utils/dates.js';
import { processRecurringForUser } from '../services/recurringService.js';
import { refreshNotifications } from '../services/notificationService.js';

const withDays = (rule) => ({
  ...rule,
  daysUntil: Math.round((new Date(rule.nextDate) - startOfDayUTC()) / DAY),
});

export const listRecurring = asyncHandler(async (req, res) => {
  await processRecurringForUser(req.user); // generate anything that became due
  const rules = await Recurring.find({ user: req.user._id }).sort({ isActive: -1, nextDate: 1 }).lean();
  res.json({ recurring: rules.map(withDays) });
});

export const createRecurring = asyncHandler(async (req, res) => {
  const { startDate, endDate, ...rest } = req.body;
  if (endDate && endDate < startDate) throw new AppError('End date must be after the start date');

  const rule = await Recurring.create({
    ...rest,
    account: rest.account || req.user.accounts[0] || 'Cash',
    user: req.user._id,
    nextDate: startDate,
    anchorDay: startDate.getUTCDate(),
    endDate: endDate || undefined,
  });
  // a start date in the past (or today) is due immediately
  const generated = await processRecurringForUser(req.user);
  if (generated) await refreshNotifications(req.user);
  const fresh = await Recurring.findById(rule._id).lean();
  res.status(201).json({ recurring: withDays(fresh), generated });
});

export const updateRecurring = asyncHandler(async (req, res) => {
  const rule = await Recurring.findOne({ _id: req.params.id, user: req.user._id });
  if (!rule) throw new AppError('Recurring transaction not found', 404);

  const { nextDate, endDate, isActive, ...rest } = req.body;
  rule.set(rest);
  if (nextDate) {
    rule.nextDate = nextDate;
    rule.anchorDay = nextDate.getUTCDate();
  }
  if (endDate !== undefined) rule.endDate = endDate || undefined;
  if (isActive !== undefined) {
    // Resuming a paused rule skips the missed occurrences instead of back-filling them
    if (isActive && !rule.isActive) {
      const today = startOfDayUTC();
      while (rule.nextDate < today) rule.nextDate = addInterval(rule.nextDate, rule.frequency, rule.anchorDay);
    }
    rule.isActive = isActive;
  }
  if (rule.endDate && rule.endDate < rule.nextDate && rule.isActive) {
    throw new AppError('End date must be after the next occurrence');
  }
  await rule.save();
  await processRecurringForUser(req.user);
  res.json({ recurring: withDays((await Recurring.findById(rule._id)).toObject()) });
});

export const deleteRecurring = asyncHandler(async (req, res) => {
  const deleted = await Recurring.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) throw new AppError('Recurring transaction not found', 404);
  res.json({ message: 'Recurring transaction deleted' }); // already generated transactions are kept
});

export const runRecurringNow = asyncHandler(async (req, res) => {
  const generated = await processRecurringForUser(req.user);
  if (generated) await refreshNotifications(req.user);
  res.json({ generated });
});