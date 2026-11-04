import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import { monthRange } from '../utils/dates.js';
import { round2, pct } from '../utils/money.js';
import { OVERALL, BUDGET_WARNING_THRESHOLD } from '../utils/constants.js';

export const budgetStatusOf = (percent) =>
  percent >= 100 ? 'exceeded' : percent >= BUDGET_WARNING_THRESHOLD ? 'warning' : 'ok';

// Budgets for a month with live "spent" figures computed from real transactions
export async function getBudgetStatus(userId, month) {
  const { from, to } = monthRange(month);
  const [budgets, spentRows] = await Promise.all([
    Budget.find({ user: userId, month }).lean(),
    Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(String(userId)), type: 'expense', date: { $gte: from, $lt: to } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
  ]);
  const byCategory = Object.fromEntries(spentRows.map((r) => [r._id, r.total]));
  const totalSpent = spentRows.reduce((s, r) => s + r.total, 0);

  return budgets
    .map((b) => {
      const spent = round2(b.category === OVERALL ? totalSpent : byCategory[b.category] ?? 0);
      const percent = pct(spent, b.limit);
      return {
        _id: b._id,
        month: b.month,
        category: b.category,
        limit: b.limit,
        spent,
        remaining: round2(b.limit - spent),
        percent,
        status: budgetStatusOf(percent),
      };
    })
    .sort((a, b) => (a.category === OVERALL ? -1 : b.category === OVERALL ? 1 : b.percent - a.percent));
}