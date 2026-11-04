import Budget from '../models/Budget.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { monthKey, shiftMonth } from '../utils/dates.js';
import { getBudgetStatus } from '../services/budgetService.js';
import { refreshNotifications } from '../services/notificationService.js';

export const listBudgets = asyncHandler(async (req, res) => {
  const month = req.query.month || monthKey(new Date());
  res.json({ month, budgets: await getBudgetStatus(req.user._id, month) });
});

// One budget per (month, category); category "overall" is the total monthly budget
export const upsertBudget = asyncHandler(async (req, res) => {
  const { month, category, limit } = req.body;
  await Budget.findOneAndUpdate(
    { user: req.user._id, month, category },
    { $set: { limit } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await refreshNotifications(req.user);
  const budgets = await getBudgetStatus(req.user._id, month);
  res.status(201).json({ budget: budgets.find((b) => b.category === category) });
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const deleted = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) throw new AppError('Budget not found', 404);
  res.json({ message: 'Budget deleted' });
});

// Carry last month's limits over without overwriting budgets already set for this month
export const copyPreviousBudgets = asyncHandler(async (req, res) => {
  const { month } = req.body;
  const previous = await Budget.find({ user: req.user._id, month: shiftMonth(month, -1) }).lean();
  if (!previous.length) throw new AppError('No budgets found in the previous month', 404);

  const result = await Budget.bulkWrite(
    previous.map((b) => ({
      updateOne: {
        filter: { user: req.user._id, month, category: b.category },
        update: { $setOnInsert: { limit: b.limit } },
        upsert: true,
      },
    }))
  );
  await refreshNotifications(req.user);
  res.json({ copied: result.upsertedCount });
});