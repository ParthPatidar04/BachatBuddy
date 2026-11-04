import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Goal from '../models/Goal.js';
import Bill from '../models/Bill.js';
import Recurring from '../models/Recurring.js';
import { totalsBetween, categoryTotals, monthlySeries, weeklyExpenses } from './analyticsService.js';
import { getBudgetStatus } from './budgetService.js';
import { serializeGoal } from './goalService.js';
import { addDays, DAY, monthKey, monthRange, monthStart, shiftMonth, startOfDayUTC, weekStart } from '../utils/dates.js';
import { round2, changePct, formatMoney } from '../utils/money.js';

// One place that computes every figure the dashboard and the AI assistant rely on.
// Everything comes from real database records - nothing is hardcoded or estimated.
export async function getFinancialSnapshot(user) {
  const userId = user._id;
  const oid = new mongoose.Types.ObjectId(String(userId));
  const now = new Date();
  const today = startOfDayUTC(now);
  const month = monthKey(now);
  const previousMonth = shiftMonth(month, -1);
  const cur = monthRange(month);
  const prev = monthRange(previousMonth);
  const prevSameDaysTo = new Date(Math.min(addDays(prev.from, now.getUTCDate()).getTime(), prev.to.getTime()));
  const sixMonthsFrom = monthStart(shiftMonth(month, -5));
  const weeksFrom = addDays(weekStart(today), -7 * 7);
  const baselineFrom = monthStart(shiftMonth(month, -3));

  const [
    allTime, savedRows, thisMonth, lastMonth, lastMonthSameDays, categoriesThisMonth, categoriesLastMonth,
    baseline, monthly, weekly, budgets, largest, recent, goalDocs, bills, rules,
  ] = await Promise.all([
    totalsBetween(userId),
    Goal.aggregate([{ $match: { user: oid } }, { $group: { _id: null, total: { $sum: '$savedAmount' } } }]),
    totalsBetween(userId, cur.from, cur.to),
    totalsBetween(userId, prev.from, prev.to),
    totalsBetween(userId, prev.from, prevSameDaysTo),
    categoryTotals(userId, cur.from, cur.to),
    categoryTotals(userId, prev.from, prev.to),
    categoryTotals(userId, baselineFrom, cur.from),
    monthlySeries(userId, sixMonthsFrom, cur.to),
    weeklyExpenses(userId, weeksFrom, addDays(today, 1)),
    getBudgetStatus(userId, month),
    Transaction.find({ user: userId, type: 'expense', date: { $gte: cur.from, $lt: cur.to } })
      .sort({ amount: -1 }).limit(5).select('title amount category date').lean(),
    Transaction.find({ user: userId }).sort({ date: -1, createdAt: -1 }).limit(20).lean(),
    Goal.find({ user: userId }).sort({ createdAt: -1 }).lean(),
    Bill.find({ user: userId, status: 'pending', dueDate: { $lte: addDays(today, 30) } }).sort({ dueDate: 1 }).lean(),
    Recurring.find({ user: userId, isActive: true, nextDate: { $lte: addDays(today, 30) } }).sort({ nextDate: 1 }).lean(),
  ]);

  const savedInGoals = round2(savedRows[0]?.total ?? 0);
  const balance = round2(allTime.income - allTime.expense - savedInGoals);

  // anomalies: this month's category spend vs its 3-month average
  const baselineMap = Object.fromEntries(baseline.map((c) => [c.category, c.total / 3]));
  const anomalies = categoriesThisMonth
    .map((c) => {
      const avg = baselineMap[c.category] ?? 0;
      return { category: c.category, current: c.total, average: round2(avg), increasePct: avg > 0 ? round2(((c.total - avg) / avg) * 100) : null };
    })
    .filter((a) => a.average > 0 && a.current > a.average * 1.5 && a.current - a.average > 0.05 * thisMonth.expense)
    .sort((a, b) => b.increasePct - a.increasePct);

  const upcoming = [
    ...bills.map((b) => ({
      kind: 'bill', id: b._id, title: b.name, amount: b.amount, type: 'expense', date: b.dueDate,
      overdue: b.dueDate < today, daysUntil: Math.round((b.dueDate - today) / DAY),
    })),
    ...rules.map((r) => ({
      kind: 'recurring', id: r._id, title: r.title, amount: r.amount, type: r.type, date: r.nextDate,
      frequency: r.frequency, overdue: false, daysUntil: Math.round((r.nextDate - today) / DAY),
    })),
  ].sort((a, b) => a.date - b.date);

  const snapshot = {
    currency: user.currency,
    today: today.toISOString().slice(0, 10),
    month,
    previousMonth,
    dayOfMonth: now.getUTCDate(),
    allTime: { income: allTime.income, expense: allTime.expense, savedInGoals, balance },
    thisMonth,
    lastMonth,
    lastMonthSameDays,
    expenseChangePct: changePct(thisMonth.expense, lastMonthSameDays.expense),
    incomeChangePct: changePct(thisMonth.income, lastMonthSameDays.income),
    categoriesThisMonth,
    categoriesLastMonth,
    monthly,
    weekly,
    budgets,
    anomalies,
    largestExpensesThisMonth: largest,
    recentTransactions: recent,
    goals: goalDocs.map((g) => serializeGoal(g, now)),
    upcoming,
  };
  snapshot.insights = buildInsights(snapshot);
  return snapshot;
}

function buildInsights(s) {
  if (s.thisMonth.count === 0 && s.lastMonth.count === 0 && s.allTime.income + s.allTime.expense === 0) {
    return ['Add your first transactions to unlock spending insights.'];
  }
  const fmt = (n) => formatMoney(n, s.currency);
  const out = [];
  const over = s.budgets.filter((b) => b.status === 'exceeded');
  if (over.length) out.push(`${over.length} budget${over.length > 1 ? 's are' : ' is'} over the limit this month.`);
  if (s.anomalies[0]) out.push(`${s.anomalies[0].category} spending is ${s.anomalies[0].increasePct}% above your recent monthly average.`);
  if (s.expenseChangePct !== null && s.lastMonthSameDays.expense > 0) {
    out.push(`You have spent ${Math.abs(s.expenseChangePct)}% ${s.expenseChangePct > 0 ? 'more' : 'less'} than in the same days of last month.`);
  }
  const top = s.categoriesThisMonth[0];
  if (top) out.push(`${top.category} is your biggest expense this month: ${fmt(top.total)} (${top.percent}% of spending).`);
  if (s.thisMonth.income > 0) out.push(`Your savings rate this month is ${s.thisMonth.savingsRate}%.`);
  return out.length ? out.slice(0, 4) : ['No spending recorded this month yet.'];
}