import mongoose from 'mongoose';
import Goal from '../models/Goal.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { round2, formatMoney } from '../utils/money.js';
import { serializeGoal } from '../services/goalService.js';
import { totalsBetween } from '../services/analyticsService.js';
import { refreshNotifications } from '../services/notificationService.js';

export const listGoals = asyncHandler(async (req, res) => {
  const goals = (await Goal.find({ user: req.user._id }).sort({ createdAt: -1 })).map((g) => serializeGoal(g));
  const totalSaved = round2(goals.reduce((s, g) => s + g.savedAmount, 0));
  const totalTarget = round2(goals.reduce((s, g) => s + g.targetAmount, 0));
  res.json({ goals, summary: { totalSaved, totalTarget, active: goals.filter((g) => !g.completed).length } });
});

export const createGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.create({ ...req.body, user: req.user._id });
  res.status(201).json({ goal: serializeGoal(goal) });
});

export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) throw new AppError('Goal not found', 404);
  if (req.body.targetAmount !== undefined && req.body.targetAmount < goal.savedAmount) {
    throw new AppError('Target cannot be lower than the amount already saved');
  }
  goal.set(req.body);
  await goal.save();
  res.json({ goal: serializeGoal(goal) });
});

// Deleting a goal releases its saved money back into the available balance
// (balance = income - expenses - money held in goals).
export const deleteGoal = asyncHandler(async (req, res) => {
  const deleted = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) throw new AppError('Goal not found', 404);
  res.json({ message: 'Goal deleted', released: deleted.savedAmount });
});

export const contribute = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) throw new AppError('Goal not found', 404);

  const currency = req.user.currency;
  const remaining = round2(goal.targetAmount - goal.savedAmount);
  if (remaining <= 0) throw new AppError('This goal is already complete');
  if (amount > remaining) throw new AppError(`You only need ${formatMoney(remaining, currency)} more to reach this goal`);

  // you can only save money you actually have
  const [totals, savedRows] = await Promise.all([
    totalsBetween(req.user._id),
    Goal.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(req.user._id)) } },
      { $group: { _id: null, total: { $sum: '$savedAmount' } } },
    ]),
  ]);
  const available = round2(totals.income - totals.expense - (savedRows[0]?.total ?? 0));
  if (amount > available) {
    throw new AppError(`Not enough available balance (${formatMoney(Math.max(available, 0), currency)}). Add income first.`);
  }

  // Pipeline update: rounds server-side (no floating point drift) and the filter
  // guarantees a concurrent request can't push the goal past its target.
  const updated = await Goal.findOneAndUpdate(
    {
      _id: goal._id,
      user: req.user._id,
      $expr: { $lte: [{ $add: ['$savedAmount', amount] }, { $add: ['$targetAmount', 0.005] }] },
    },
    [
      {
        $set: {
          savedAmount: { $round: [{ $add: ['$savedAmount', amount] }, 2] },
          contributions: { $concatArrays: [{ $ifNull: ['$contributions', []] }, [{ amount, date: new Date() }]] },
        },
      },
    ],
    { new: true }
  );
  if (!updated) throw new AppError('This goal just changed. Please try again.', 409);

  await refreshNotifications(req.user);
  res.json({ goal: serializeGoal(updated) });
});