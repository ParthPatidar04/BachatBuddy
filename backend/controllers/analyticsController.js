import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { addDays, DAY, isoDay, monthKey, monthsBetween, monthStart, shiftMonth, startOfDayUTC } from '../utils/dates.js';
import { changePct, round2 } from '../utils/money.js';
import { totalsBetween, categoryTotals, monthlySeries, weeklyExpenses } from '../services/analyticsService.js';
import { getFinancialSnapshot } from '../services/snapshotService.js';
import { processRecurringForUser } from '../services/recurringService.js';

// Everything the dashboard needs in ONE request
export const getDashboard = asyncHandler(async (req, res) => {
  await processRecurringForUser(req.user);
  const s = await getFinancialSnapshot(req.user);
  res.json({
    currency: s.currency,
    month: s.month,
    summary: {
      balance: s.allTime.balance,
      income: s.allTime.income,
      expense: s.allTime.expense,
      savings: s.allTime.savedInGoals,
      thisMonth: s.thisMonth,
      lastMonth: s.lastMonth,
      expenseChangePct: s.expenseChangePct,
      incomeChangePct: s.incomeChangePct,
    },
    monthly: s.monthly,
    weekly: s.weekly,
    categories: s.categoriesThisMonth,
    budgets: s.budgets,
    recent: s.recentTransactions.slice(0, 6),
    goals: s.goals.filter((g) => !g.completed).slice(0, 4),
    upcoming: s.upcoming.slice(0, 6),
    insights: s.insights,
  });
});

// Analytics for a user-selected date range (default: last 6 months)
export const getAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const toExclusive = req.query.to ? addDays(startOfDayUTC(req.query.to), 1) : addDays(startOfDayUTC(now), 1);
  const from = req.query.from ? startOfDayUTC(req.query.from) : monthStart(shiftMonth(monthKey(now), -5));

  if (from >= toExclusive) throw new AppError('"from" must be before "to"');
  if ((toExclusive - from) / DAY > 366 * 3) throw new AppError('Please choose a range of 3 years or less');

  // the previous period has exactly the same length, directly before the selected one
  const prevFrom = new Date(from.getTime() - (toExclusive - from));
  const [totals, previous, categories, prevCategories, monthly, weekly] = await Promise.all([
    totalsBetween(req.user._id, from, toExclusive),
    totalsBetween(req.user._id, prevFrom, from),
    categoryTotals(req.user._id, from, toExclusive),
    categoryTotals(req.user._id, prevFrom, from),
    monthlySeries(req.user._id, from, toExclusive),
    weeklyExpenses(req.user._id, from, toExclusive),
  ]);

  const prevMap = Object.fromEntries(prevCategories.map((c) => [c.category, c.total]));
  const monthsInRange = monthsBetween(from, toExclusive).length;

  res.json({
    currency: req.user.currency,
    range: { from: isoDay(from), to: isoDay(new Date(toExclusive.getTime() - DAY)) },
    previousRange: { from: isoDay(prevFrom), to: isoDay(new Date(from.getTime() - DAY)) },
    totals,
    previous,
    changes: {
      income: changePct(totals.income, previous.income),
      expense: changePct(totals.expense, previous.expense),
    },
    avgMonthlyExpense: round2(totals.expense / monthsInRange),
    categories: categories.map((c) => ({
      ...c,
      previousTotal: round2(prevMap[c.category] ?? 0),
      change: changePct(c.total, prevMap[c.category] ?? 0),
    })),
    topCategories: categories.slice(0, 5),
    monthly,
    weekly,
  });
});